You are now executing Web Phase 3.

Goal:
- Implement the first real conversations and chat UI on top of the authenticated app shell
- Keep scope limited to conversations and SSE chat only

Must complete:
- Implement conversation list loading and creation
- Implement message history loading
- Implement chat composer and SSE rendering
- Reflect `conversation.updated` and `profile.updated` in the UI

Strong constraints:
- Do not introduce V2 features
- Do not expand the SSE event surface
- Do not modify shared contracts unless required for compilation
- Keep the UI small and maintainable

Allowed outcomes:
- An authenticated app page that supports:
  - creating a conversation
  - viewing message history
  - sending a message
  - receiving streamed assistant output

Output requirements:
1. First output the files to create/modify and assumptions/risks
2. Then implement
3. After completion report:
   - what was implemented
   - files changed
   - how to validate locally
   - what remains unimplemented
