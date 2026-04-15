param(
  [ValidateSet("en", "zh")]
  [string]$Scenario = "en",
  [string]$GoalText = "improve speaking confidence",
  [string]$CurrentLevelText = "can read docs but weak in spoken english",
  [int]$WeeklyTimeMinutes = 180,
  [string[]]$UserDeclaredWeakPoints = @("fluency", "structure"),
  [string]$ChatContent = "Help me practice an English self-introduction opening"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ($Scenario -eq "zh") {
  $zhScenario = ConvertFrom-Json @'
{
  "goalText": "\u63d0\u5347\u82f1\u8bed\u53e3\u8bed\u8868\u8fbe",
  "currentLevelText": "\u80fd\u8bfb\u6280\u672f\u6587\u6863\uff0c\u4f46\u53e3\u8bed\u504f\u5f31",
  "userDeclaredWeakPoints": [
    "\u53e3\u8bed\u7ec4\u7ec7",
    "\u5373\u65f6\u8868\u8fbe"
  ],
  "chatContent": "\u5e2e\u6211\u7ec3\u4e60\u4e00\u4e2a\u82f1\u8bed\u81ea\u6211\u4ecb\u7ecd\u5f00\u573a"
}
'@
  $GoalText = $zhScenario.goalText
  $CurrentLevelText = $zhScenario.currentLevelText
  $WeeklyTimeMinutes = 180
  $UserDeclaredWeakPoints = @($zhScenario.userDeclaredWeakPoints)
  $ChatContent = $zhScenario.chatContent
}

$repoRoot = "D:\Codex\ai_voice_assistant"
$runId = [guid]::NewGuid().ToString("N")
$smtpPort = Get-Random -Minimum 20000 -Maximum 24000
$modelPort = Get-Random -Minimum 24001 -Maximum 28000
$smtpInbox = Join-Path $env:TEMP "ai_voice_assistant_smtp_inbox_$runId.txt"
$chatBodyPath = Join-Path $env:TEMP "ai_voice_assistant_chat_body_$runId.json"

if (Test-Path $smtpInbox) {
  Remove-Item $smtpInbox -Force
}
if (Test-Path $chatBodyPath) {
  Remove-Item $chatBodyPath -Force
}

function Wait-TcpReady {
  param(
    [int]$Port,
    [string]$Name
  )

  for ($i = 0; $i -lt 40; $i++) {
    $connection = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
    if ($connection) {
      return
    }
    Start-Sleep -Milliseconds 250
  }

  throw "$Name was not ready on port $Port"
}

$jobs = @()
$jobs += Start-Job -ScriptBlock {
  python "D:\Codex\ai_voice_assistant\scripts\local\mock_smtp.py" $using:smtpPort $using:smtpInbox
}
$jobs += Start-Job -ScriptBlock {
  python "D:\Codex\ai_voice_assistant\scripts\local\mock_model.py" $using:modelPort
}
$jobs += Start-Job -ScriptBlock {
  $env:SMTP_PORT = "$using:smtpPort"
  $env:MODEL_BASE_URL = "http://127.0.0.1:$using:modelPort/v1"
  Set-Location "D:\Codex\ai_voice_assistant\apps\api"
  node -r ts-node/register src/main.ts
}

try {
  Wait-TcpReady -Port $smtpPort -Name "SMTP mock"
  Wait-TcpReady -Port $modelPort -Name "Model mock"

  $ready = $false
  for ($i = 0; $i -lt 40; $i++) {
    try {
      $null = Invoke-RestMethod http://127.0.0.1:3000/api/health -TimeoutSec 1
      $ready = $true
      break
    } catch {
      Start-Sleep -Milliseconds 500
    }
  }

  if (-not $ready) {
    throw "API not ready within timeout"
  }

  $health = Invoke-RestMethod http://127.0.0.1:3000/api/health
  $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  $email = "codex.$([guid]::NewGuid().ToString('N').Substring(0, 8))@example.com"

  $sendCode = Invoke-RestMethod `
    -Method Post `
    -Uri "http://127.0.0.1:3000/api/auth/send-code" `
    -WebSession $session `
    -ContentType "application/json" `
    -Body (@{ email = $email } | ConvertTo-Json)

  $code = $null
  for ($i = 0; $i -lt 40; $i++) {
    if (Test-Path $smtpInbox) {
      $match = [regex]::Match(
        (Get-Content $smtpInbox -Raw -Encoding UTF8),
        "(?<!\d)(\d{6})(?!\d)"
      )
      if ($match.Success) {
        $code = $match.Groups[1].Value
        break
      }
    }
    Start-Sleep -Milliseconds 500
  }

  if (-not $code) {
    throw "Verification code not captured from SMTP inbox"
  }

  $verify = Invoke-RestMethod `
    -Method Post `
    -Uri "http://127.0.0.1:3000/api/auth/verify-code" `
    -WebSession $session `
    -ContentType "application/json" `
    -Body (@{ email = $email; code = $code } | ConvertTo-Json)

  $me = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:3000/api/me" -WebSession $session
  $profileBefore = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:3000/api/learning-profile" -WebSession $session
  $profilePatchJson = (@{
      goalText = $GoalText
      currentLevelText = $CurrentLevelText
      weeklyTimeMinutes = $WeeklyTimeMinutes
      userDeclaredWeakPoints = $UserDeclaredWeakPoints
    } | ConvertTo-Json -Compress)
  $profilePatchBytes = [System.Text.Encoding]::UTF8.GetBytes($profilePatchJson)
  $profileAfter = Invoke-RestMethod `
    -Method Patch `
    -Uri "http://127.0.0.1:3000/api/learning-profile" `
    -WebSession $session `
    -ContentType "application/json; charset=utf-8" `
    -Body $profilePatchBytes

  $conversationCreated = Invoke-RestMethod `
    -Method Post `
    -Uri "http://127.0.0.1:3000/api/conversations" `
    -WebSession $session `
    -ContentType "application/json" `
    -Body "{}"

  $conversationId = $conversationCreated.conversation.id
  $conversationsBeforeChat = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:3000/api/conversations" -WebSession $session
  $messagesBeforeChat = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:3000/api/conversations/${conversationId}/messages" -WebSession $session

  $cookieUri = [Uri]"http://127.0.0.1:3000"
  $cookieHeader = ($session.Cookies.GetCookies($cookieUri) | ForEach-Object { "$($_.Name)=$($_.Value)" }) -join "; "
  $chatBodyJson = @{ content = $ChatContent } | ConvertTo-Json -Compress
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($chatBodyPath, $chatBodyJson, $utf8NoBom)
  $chatSse = & curl.exe -sN `
    -X POST `
    "http://127.0.0.1:3000/api/conversations/${conversationId}/messages" `
    -H "Content-Type: application/json" `
    -H "Cookie: $cookieHeader" `
    --data-binary "@$chatBodyPath"

  $messagesAfterChat = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:3000/api/conversations/${conversationId}/messages" -WebSession $session
  $conversationsAfterChat = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:3000/api/conversations" -WebSession $session
  $chatSseText = ($chatSse -join "`n")
  $eventNames = [regex]::Matches($chatSseText, "(?m)^event: ([^\r\n]+)$") | ForEach-Object { $_.Groups[1].Value }

  [ordered]@{
    health = $health
    sendCode = $sendCode
    capturedCode = $code
    verifyUser = $verify.user
    meUser = $me.user
    profileBefore = $profileBefore.profile
    profileAfter = $profileAfter.profile
    conversationCreated = $conversationCreated.conversation
    conversationsBeforeChatCount = $conversationsBeforeChat.items.Count
    messagesBeforeChatCount = $messagesBeforeChat.items.Count
    sseEvents = @($eventNames)
    sseRaw = $chatSseText
    messagesAfterChatCount = $messagesAfterChat.items.Count
    messagesAfterChat = $messagesAfterChat.items
    conversationAfterChat = $conversationsAfterChat.items[0]
  } | ConvertTo-Json -Depth 10
}
finally {
  foreach ($job in $jobs) {
    Stop-Job $job -ErrorAction SilentlyContinue | Out-Null
    Remove-Job $job -Force -ErrorAction SilentlyContinue | Out-Null
  }
}
