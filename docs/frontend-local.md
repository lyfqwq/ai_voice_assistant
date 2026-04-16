# 前端联调说明

这份文档描述当前 `apps/web` 已经具备的真实前端联调能力，以及现在最推荐的本地验证路径。

## 当前状态

`apps/web` 目前已经具备：
- Vue 3 + Vite + TypeScript 可运行工程
- guest / authenticated 路由分支
- 邮箱验证码登录页面
- onboarding 页面
- conversation list
- message history
- chat composer
- SSE assistant 流式展示
- 基础的 loading / empty / error 态
- 失败消息的重试入口

当前主要剩余的是进一步的交互 polish，不是主链路缺失。

## 1. 本地启动

推荐开两个终端。

终端 1：启动后端

```powershell
cd "D:\Codex\ai_voice_assistant"
corepack pnpm dev:api
```

终端 2：启动前端

```powershell
cd "D:\Codex\ai_voice_assistant"
corepack pnpm dev:web
```

前端地址：

```text
http://127.0.0.1:5173
```

后端健康检查：

```text
http://127.0.0.1:3000/api/health
```

## 2. 本地代理与 Cookie

前端 dev server 已经配置了代理：
- `/api` -> `http://127.0.0.1:3000`

因此前端请求直接走 `/api/...` 即可。

当前认证方式仍然是：
- server-side session
- HttpOnly cookie

前端请求默认带：
- `credentials: "include"`

这意味着：
- 不需要前端保存 JWT
- `/api/me` 仍然是前端恢复登录态的基准接口

## 3. 当前已接通的前端链路

### Auth

前端已接：
- `POST /api/auth/send-code`
- `POST /api/auth/verify-code`
- `POST /api/auth/logout`
- `GET /api/me`

当前页面行为：
- guest 进入 `/auth`
- 登录成功后自动进入 `/app`
- logout 后回到 guest 状态
- 验证码发送后会显示 resend 倒计时

### Onboarding

前端已接：
- `GET /api/learning-profile`
- `PATCH /api/learning-profile`

当前页面行为：
- 没有 profile 时显示 onboarding 表单
- 提交后创建 `learning_profiles`
- 前端 session 同步切为 `onboardingCompleted = true`

### Conversations

前端已接：
- `POST /api/conversations`
- `GET /api/conversations`
- `GET /api/conversations/:id/messages`

当前页面行为：
- 可以创建新对话
- 可以点击左侧列表切换会话
- 可以加载消息历史
- conversation list 有基础 loading 与 empty state

### Chat SSE

前端已接：
- `POST /api/conversations/:id/messages`

当前已处理的事件：
- `ack`
- `delta`
- `completed`
- `conversation.updated`
- `profile.updated`
- `error`
- `done`

当前页面行为：
- 先插入本地 user message
- 创建 assistant 占位消息
- `delta` 逐步追加到 assistant 内容
- `completed` 后替换为最终 assistant message
- `conversation.updated` 后刷新当前会话标题和列表项
- `profile.updated` 后刷新学习画像摘要
- message list 会在切换会话和流式回复时自动滚动到底部
- 发送失败后会保留一个“Retry last prompt”入口

## 4. 推荐手工联调顺序

1. 打开 `/auth`
2. 请求邮箱验证码
3. 输入验证码并登录
4. 进入 `/app`
5. 如果还没有 profile，先完成 onboarding
6. 创建一个新 conversation
7. 发送一条消息
8. 确认 assistant 是流式出现的
9. 确认首轮标题会从 `新对话` 更新为真实标题
10. 确认 profile 摘要里的 `recentTopics / progressNotes` 会刷新
11. 人为制造一次失败后，确认可以点击重试

## 5. 当前最值得重点观察的点

### 登录恢复

刷新页面后，前端会重新调：

```text
GET /api/me
```

如果 session 还有效，应直接恢复到 authenticated 分支。

### 会话标题联动

首轮 chat 完成后，后端会通过：

```text
event: conversation.updated
```

把新标题推回来。前端现在会同步更新：
- 当前聊天 header
- 左侧 conversation list

### SSE 错误态

如果 `error` 事件到达：
- 当前会显示错误提示
- 不会把空 assistant 占位永久留在界面里
- 失败 prompt 会保存下来供一键重试

## 6. 现在还没做的部分

以下仍属于下一轮可继续 polish 的内容：
- conversations 分页
- 更细的骨架屏层级
- 更细的表单校验反馈
- 更细的 SSE 断线恢复策略
- 移动端更强的聊天布局优化

## 7. 当前文件入口

前端主入口：
- [apps/web/src/App.vue](D:\Codex\ai_voice_assistant\apps\web\src\App.vue)

认证页：
- [apps/web/src/pages/AuthPage.vue](D:\Codex\ai_voice_assistant\apps\web\src\pages\AuthPage.vue)

应用主页面：
- [apps/web/src/pages/AppHomePage.vue](D:\Codex\ai_voice_assistant\apps\web\src\pages\AppHomePage.vue)

API 层：
- [apps/web/src/lib/api.ts](D:\Codex\ai_voice_assistant\apps\web\src\lib\api.ts)

Session 层：
- [apps/web/src/lib/session.ts](D:\Codex\ai_voice_assistant\apps\web\src\lib\session.ts)
