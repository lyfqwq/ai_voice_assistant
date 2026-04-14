Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "Validate preflight"

node scripts/check-workspace.mjs
corepack pnpm install
corepack pnpm typecheck:api

Write-Host "Preflight validation passed."
