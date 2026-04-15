Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "Validate Phase 6"

node scripts/check-workspace.mjs
corepack pnpm install
corepack pnpm typecheck:api
& ".\scripts\validate-runtime-smoke.ps1"

Write-Host "Phase 6 validation passed."
