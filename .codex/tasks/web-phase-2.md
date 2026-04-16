You are now executing Web Phase 2.

Goal:
- Implement the first real frontend product flow on top of the existing shell
- Keep scope limited to auth and onboarding only

Must complete:
- Implement a real auth page for email code login
- Implement `send-code`, `verify-code`, and logout frontend flows
- Implement onboarding using `GET /api/learning-profile` and `PATCH /api/learning-profile`
- Route authenticated users into the app branch and guests into auth

Strong constraints:
- Do not implement conversations UI yet
- Do not implement chat UI yet
- Do not introduce V2 features
- Do not modify shared contracts unless required for compilation

Allowed outcomes:
- Functional auth page
- Functional onboarding page or authenticated home
- Session-aware routing
- A minimal authenticated placeholder after onboarding is complete

Output requirements:
1. First output the files to create/modify and assumptions/risks
2. Then implement
3. After completion report:
   - what was implemented
   - files changed
   - how to validate locally
   - what remains unimplemented
