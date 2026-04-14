你现在正在执行 Phase 4。

目标：
- 只实现 onboarding 最小闭环
- 不进入 conversations / chat

必须完成：
- GET /learning-profile
- PATCH /learning-profile
- 首次完成 onboarding 时创建 learning_profiles
- 更新 users.onboarding_completed

强约束：
- 不预创建 learning_profiles
- 不进入 conversations / chat
- 保持统一错误结构

禁止：
- 不要进入 conversations / chat
- 不要擅自修改 shared contracts，除非编译必须
