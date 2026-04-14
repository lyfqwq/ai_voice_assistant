param(
  [Parameter(Mandatory = $true)]
  [string]$Phase
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not (Get-Command codex -ErrorAction SilentlyContinue)) {
  throw "codex command was not found. Please install Codex CLI first."
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$taskFile = Join-Path $repoRoot ".codex\tasks\$Phase.md"
$currentFile = Join-Path $repoRoot ".codex\tasks\current.md"

if (-not (Test-Path $taskFile)) {
  throw "Task file does not exist: $taskFile"
}

Copy-Item $taskFile $currentFile -Force
$prompt = Get-Content $taskFile -Raw -Encoding UTF8

Push-Location $repoRoot
try {
  codex exec --full-auto $prompt
}
finally {
  Pop-Location
}
