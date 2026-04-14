Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "Validate Phase 3"

node scripts/check-workspace.mjs
corepack pnpm install
corepack pnpm typecheck:api

Write-Host "If .env is configured and PostgreSQL is available, manually validate:"
Write-Host "  corepack pnpm dev:api"
Write-Host "  GET /api/health"
Write-Host "  POST /auth/send-code"
Write-Host "  POST /auth/verify-code"

Write-Host "Phase 3 validation passed."
