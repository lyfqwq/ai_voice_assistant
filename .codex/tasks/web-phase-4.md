You are now executing Web Phase 4.

Goal:
- Polish the existing frontend MVP flow without expanding product scope
- Improve local integration usability and QA readiness

Must complete:
- Improve loading, empty, and error states in the current frontend flow
- Add a practical retry path for failed chat sends
- Improve message list behavior during streaming
- Update frontend documentation to match the real current state

Strong constraints:
- Do not introduce V2 features
- Do not add new backend endpoints
- Do not modify shared contracts unless required for compilation
- Keep the product surface the same: auth, onboarding, conversations, chat

Allowed outcomes:
- Better UX around the existing flow
- More reliable local manual QA
- Clearer frontend runbook

Output requirements:
1. First output the files to create/modify and assumptions/risks
2. Then implement
3. After completion report:
   - what was implemented
   - files changed
   - how to validate locally
   - what remains unimplemented
