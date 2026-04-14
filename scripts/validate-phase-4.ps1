Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "Validate Phase 4"

node scripts/check-workspace.mjs
corepack pnpm install
corepack pnpm typecheck:api

Write-Host "If database and API are available, manually validate:"
Write-Host "  GET /learning-profile"
Write-Host "  PATCH /learning-profile"

Write-Host "Phase 4 validation passed."
