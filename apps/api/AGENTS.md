# API AGENTS

## Scope
- This file applies to backend work under `apps/api`.

## API rules
- Keep NestJS modules explicit and small.
- Put infrastructure under:
  - `src/common`
  - `src/config`
  - `src/db`
- Put business modules under:
  - `src/modules`

## Database rules
- Migration-first, not entity-first guessing.
- Do not add business services/controllers/repositories unless the current phase requires them.
- Use reversible migrations when practical.

## Schema constraints
- `messages.role` only allows `user` and `assistant`
- `messages.status` allows at least `completed` and `failed`
- `messages.seq_no` must be unique within a conversation
- No soft delete in MVP
- No PostgreSQL enum; use text + check constraint
