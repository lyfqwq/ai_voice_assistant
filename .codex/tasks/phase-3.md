你现在正在执行 Phase 3。

目标：
- 只实现 auth 最小闭环
- 不进入 onboarding / conversations / chat

必须完成：
- POST /auth/send-code
- POST /auth/verify-code
- POST /auth/logout
- GET /me

强约束：
- 使用 server-side session + HttpOnly cookie
- 不使用前端持久化 JWT
- 明文验证码不落库
- auth_sessions 存 token hash
- 统一错误结构

禁止：
- 不要进入 onboarding / conversations / chat
- 不要擅自修改 shared contracts，除非编译必须
