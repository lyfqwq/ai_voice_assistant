你现在正在执行 Phase 2。

目标：
- 只实现数据库 schema 与 migrations
- 不进入 auth / onboarding / conversations / chat 业务逻辑
- 不修改 shared contracts

必须完成：
- 创建 migration，落以下表：
  - users
  - email_verification_codes
  - auth_sessions
  - learning_profiles
  - conversations
  - messages

强约束：
- learning_profiles 在 onboarding 完成时创建，不在注册时预创建
- conversations.title 默认 '新对话'
- conversations.title_generated 默认 false
- messages.role 仅允许 user / assistant
- messages.status 至少支持 completed / failed
- messages.seq_no 在 conversation 内唯一
- 不做 soft delete
- 不做 PostgreSQL enum，统一 text + check constraint
- 保持 synchronize: false
- 保持 migrationsRun: false

禁止：
- 不要实现 controller / service / repository 业务逻辑
- 不要跳到 auth phase
- 不要擅自修改 `packages/shared/src/contracts`

输出要求：
1. 先输出将创建/修改的文件清单
2. 再开始实现
3. 完成后汇报：
   - 实现了什么
   - 创建/修改了哪些文件
   - migration 涉及哪些表和约束
   - 本地如何验证
   - 当前未实现的内容
