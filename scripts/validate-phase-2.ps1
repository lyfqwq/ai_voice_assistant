Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "Validate Phase 2"

node scripts/check-workspace.mjs
corepack pnpm install
corepack pnpm typecheck:api

$phase2Migration = Get-ChildItem "apps/api/src/db/migrations" -Filter "*CreatePhase2Schema.ts" -ErrorAction SilentlyContinue
if (-not $phase2Migration) {
  throw "Phase 2 migration file was not found."
}

Write-Host "Phase 2 validation passed."
