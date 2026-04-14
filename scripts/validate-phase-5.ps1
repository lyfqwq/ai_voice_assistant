Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "Validate Phase 5"

node scripts/check-workspace.mjs
corepack pnpm install
corepack pnpm typecheck:api

Write-Host "If API is available, manually validate:"
Write-Host "  POST /conversations"
Write-Host "  GET /conversations"
Write-Host "  GET /conversations/:id/messages"

Write-Host "Phase 5 validation passed."
