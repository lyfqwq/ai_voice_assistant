Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Push-Location $repoRoot

try {
  $phases = @(
    "preflight",
    "phase-3",
    "phase-4",
    "phase-5",
    "phase-6"
  )

  foreach ($phase in $phases) {
    Write-Host ""
    Write-Host "=============================="
    Write-Host "Running $phase"
    Write-Host "=============================="

    Copy-Item ".codex\tasks\$phase.md" ".codex\tasks\current.md" -Force

    $prompt = Get-Content ".codex\tasks\$phase.md" -Raw
    codex exec $prompt
    if ($LASTEXITCODE -ne 0) {
      throw "Codex failed in $phase"
    }

    $validator = ".\scripts\validate-$phase.ps1"
    if (Test-Path $validator) {
      & $validator
      if ($LASTEXITCODE -ne 0) {
        throw "Validation failed in $phase"
      }
    }

    git add .
    git commit -m "feat($phase): complete $phase"
  }

  Write-Host ""
  Write-Host "All phases completed."
}
finally {
  Pop-Location
}
