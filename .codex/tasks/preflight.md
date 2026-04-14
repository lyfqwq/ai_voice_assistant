You are executing preflight.

Goal:
- Only fix environment blockers before automation can continue
- Do not enter business feature development

Must complete:
- Check dependency declarations in:
  - root package.json
  - apps/api/package.json
  - apps/web/package.json
  - packages/shared/package.json
- Fix the current TypeScript module resolution failure
- Make these commands pass:
  - corepack pnpm install
  - corepack pnpm typecheck:api

Forbidden:
- Do not enter auth / onboarding / conversations / chat implementation
- Do not revert existing migration work
- Do not modify shared contracts unless strictly required for compilation

Output requirements:
1. First output the file list to create or modify
2. Then implement
3. After completion report:
   - which blockers were solved
   - which files were changed
   - which commands now pass
   - what is still required before phase-3 can start
