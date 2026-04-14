# AI Voice Assistant - Repository AGENTS

## Working mode
- Always work phase by phase.
- Do not expand scope beyond the current phase.
- Before changing files, read:
  1. this file
  2. `.codex/tasks/current.md`
  3. the closest nested `AGENTS.md` in the current working area

## Repository structure
- `apps/api`: NestJS backend
- `apps/web`: Vue 3 frontend
- `packages/shared`: shared contracts and types
- `scripts`: repository scripts

## Core stack
- Monorepo: pnpm
- Backend: NestJS + TypeScript + TypeORM + PostgreSQL
- Frontend: Vue 3 + Vite + TypeScript
- Shared contracts live in `packages/shared/src/contracts`

## Global engineering rules
- Prefer minimal diffs.
- Do not refactor unrelated code.
- Do not introduce V2 features.
- Database changes must go through explicit migrations.
- Never enable TypeORM schema auto sync.
- Do not modify `packages/shared/src/contracts` unless the current phase explicitly requires it.
- If blocked by missing env, DB, GitHub auth, or dependencies, stop and report the exact blocker.

## Current product constraints
- Authentication is server-side session + HttpOnly cookie.
- `learning_profiles` are created when onboarding is completed, not at user registration.
- `conversations.title` defaults to `新对话`.
- `conversations.title_generated` defaults to `false`.
- MVP does not support soft delete.
- Use text + check constraints instead of PostgreSQL enum types.

## Delivery format for each phase
- First output:
  - files to create or modify
  - assumptions or risks
- After implementation:
  - what was implemented
  - files changed
  - how to validate locally
  - what remains unimplemented
