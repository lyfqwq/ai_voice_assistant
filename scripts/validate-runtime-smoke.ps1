Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Assert-Condition {
  param(
    [bool]$Condition,
    [string]$Message
  )

  if (-not $Condition) {
    throw $Message
  }
}

function Run-SmokeScenario {
  param(
    [ValidateSet("en", "zh")]
    [string]$Scenario
  )

  $lastErrorMessage = $null
  for ($attempt = 1; $attempt -le 3; $attempt++) {
    try {
      $raw = & ".\scripts\local\runtime-smoke.ps1" -Scenario $Scenario | Out-String
      $result = $raw | ConvertFrom-Json

      Assert-Condition ($result.health.status -eq "ok") "[$Scenario] health check failed"
      Assert-Condition ($result.sendCode.ok -eq $true) "[$Scenario] send-code failed"
      Assert-Condition (-not [string]::IsNullOrWhiteSpace($result.capturedCode)) "[$Scenario] verification code missing"
      Assert-Condition ($result.verifyUser.id -eq $result.meUser.id) "[$Scenario] verify/me user mismatch"
      Assert-Condition ($null -eq $result.profileBefore) "[$Scenario] profileBefore should be null"
      Assert-Condition ($null -ne $result.profileAfter) "[$Scenario] profileAfter missing"
      Assert-Condition ($result.messagesBeforeChatCount -eq 0) "[$Scenario] messagesBeforeChatCount should be 0"
      Assert-Condition ($result.messagesAfterChatCount -eq 2) "[$Scenario] messagesAfterChatCount should be 2"
      Assert-Condition ($result.conversationAfterChat.messageCount -eq 2) "[$Scenario] conversation messageCount should be 2"
      Assert-Condition (-not [string]::IsNullOrWhiteSpace($result.conversationAfterChat.title)) "[$Scenario] title missing"
      Assert-Condition ($result.conversationCreated.title -ne $result.conversationAfterChat.title) "[$Scenario] title was not generated"

      $actualEvents = @($result.sseEvents)
      $expectedEvents = @(
        "ack",
        "delta",
        "delta",
        "delta",
        "completed",
        "conversation.updated",
        "profile.updated",
        "done"
      )

      Assert-Condition ($actualEvents.Count -eq $expectedEvents.Count) "[$Scenario] unexpected SSE event count"
      for ($i = 0; $i -lt $expectedEvents.Count; $i++) {
        Assert-Condition ($actualEvents[$i] -eq $expectedEvents[$i]) "[$Scenario] unexpected SSE event at index ${i}: $($actualEvents[$i])"
      }

      return $result
    } catch {
      $lastErrorMessage = $_.Exception.Message
      if ($attempt -lt 3) {
        Write-Host "Retrying $Scenario smoke (attempt $attempt failed)..."
        Start-Sleep -Seconds 2
      }
    }
  }

  throw "[$Scenario] runtime smoke failed after retries: $lastErrorMessage"
}

Write-Host "Validate runtime smoke"

$en = Run-SmokeScenario -Scenario en
Write-Host "English smoke passed."

$zh = Run-SmokeScenario -Scenario zh
Write-Host "Chinese smoke passed."

[ordered]@{
  enTitle = $en.conversationAfterChat.title
  zhTitle = $zh.conversationAfterChat.title
  zhProfileGoal = $zh.profileAfter.goalText
  zhEvents = @($zh.sseEvents)
} | ConvertTo-Json -Depth 5

Write-Host "Runtime smoke validation passed."
