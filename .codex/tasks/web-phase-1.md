You are now executing Web Phase 1.

Goal:
- Build the first real frontend shell in `apps/web`
- Keep scope limited to a runnable frontend foundation

Must complete:
- Turn `apps/web` from scaffold into a real Vue 3 + Vite + TypeScript app
- Add minimal routing and app shell
- Add a small API client foundation for backend calls
- Add a login-state bootstrap check against `GET /api/me`
- Keep the UI intentionally simple and maintainable

Strong constraints:
- Do not implement full auth pages yet
- Do not implement onboarding form yet
- Do not implement conversations or chat UI yet
- Do not introduce V2 features
- Do not modify shared contracts unless required for compilation

Allowed outcomes:
- A runnable app with a shell layout
- Placeholder pages for auth/home
- A typed API layer ready for next phases
- A visible authenticated vs unauthenticated shell decision based on `/api/me`

Output requirements:
1. First output the files to create/modify and assumptions/risks
2. Then implement
3. After completion report:
   - what was implemented
   - files changed
   - how to validate locally
   - what remains unimplemented
