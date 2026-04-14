Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "Validate Phase 6"

node scripts/check-workspace.mjs
corepack pnpm install
corepack pnpm typecheck:api

Write-Host "If API is available, manually validate:"
Write-Host "  POST /conversations/:id/messages"
Write-Host "  Verify SSE events: ack / delta / completed / conversation.updated / profile.updated / error / done"

Write-Host "Phase 6 validation passed."
