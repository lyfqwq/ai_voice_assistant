# 前端联调说明

这份文档描述当前 `apps/web` 已具备的真实前端联调能力，以及推荐的本地验证路径。

## 当前状态

`apps/web` 当前已经具备：
- Vue 3 + Vite + TypeScript 可运行工程
- guest / authenticated 路由分支
- 邮箱验证码登录页
- onboarding 页面
- conversation list
- message history
- chat composer
- SSE assistant 流式展示
- loading / empty / error 基础状态
- 失败消息重试入口

当前剩余的是进一步体验 polish，不是主链路缺失。

## 1. 本地启动

终端 1 启动后端：

```powershell
cd "D:\Codex\ai_voice_assistant"
corepack pnpm dev:api
```

终端 2 启动前端：

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

## 2. 代理与 Cookie

前端 dev server 已配置代理：
- `/api` -> `http://127.0.0.1:3000`

认证方式保持为：
- server-side session
- HttpOnly cookie

前端请求默认使用：
- `credentials: "include"`

这意味着：
- 不需要前端持久化 JWT
- `/api/me` 仍然是恢复登录态的基准接口

## 3. 已接通的前端链路

### Auth

前端已接：
- `POST /api/auth/send-code`
- `POST /api/auth/verify-code`
- `POST /api/auth/logout`
- `GET /api/me`

当前行为：
- guest 进入 `/auth`
- 登录成功后自动进入 `/app`
- logout 后回到 guest 状态
- 发送验证码后显示 resend 倒计时

### Onboarding

前端已接：
- `GET /api/learning-profile`
- `PATCH /api/learning-profile`

当前行为：
- 没有 profile 时显示 onboarding 表单
- 提交后创建 `learning_profiles`
- 前端 session 同步切到 `onboardingCompleted = true`

### Conversations

前端已接：
- `POST /api/conversations`
- `GET /api/conversations`
- `GET /api/conversations/:id/messages`

当前行为：
- 可创建新对话
- 可切换左侧会话
- 可加载消息历史

### Chat SSE

前端已接：
- `POST /api/conversations/:id/messages`

前端已处理事件：
- `ack`
- `delta`
- `completed`
- `conversation.updated`
- `profile.updated`
- `error`
- `done`

当前行为：
- 先插入本地 user message
- 创建 assistant 占位消息
- `delta` 逐步追加内容
- `completed` 后替换为完整 assistant message
- `conversation.updated` 后同步标题和列表
- `profile.updated` 后刷新画像摘要
- 消息区会在切换会话和流式回复时自动滚到底部
- 发送失败后提供 `Retry last prompt`

## 4. 推荐手工联调顺序

1. 打开 `/auth`
2. 请求验证码
3. 输入验证码并登录
4. 进入 `/app`
5. 如果还没有 profile，先完成 onboarding
6. 创建一个新 conversation
7. 发送一条消息
8. 确认 assistant 是流式出现的
9. 确认首轮标题从 `新对话` 更新为真实标题
10. 确认画像摘要中的 `recentTopics / progressNotes` 刷新
11. 人为制造一次发送失败，确认可以重试

## 5. 当前最值得观察的点

### 登录恢复

刷新页面后，前端会重新调用：

```text
GET /api/me
```

如果 session 仍有效，应直接恢复到 authenticated 状态。

### 标题联动

首轮 chat 完成后，后端会返回：

```text
event: conversation.updated
```

前端当前会同步更新：
- 当前聊天 header
- 左侧 conversation list

### 错误态

如果收到 `error` 事件：
- 界面会显示错误提示
- 失败 prompt 会保留下来供重试

## 6. 当前未做的部分

仍属于后续 polish 范围：
- conversations 分页
- 更细的 skeleton
- 更细的表单校验反馈
- 更强的 SSE 断线恢复策略
- 更好的移动端布局

## 7. 相关文件

- 前端主入口：[D:\Codex\ai_voice_assistant\apps\web\src\App.vue](D:\Codex\ai_voice_assistant\apps\web\src\App.vue)
- 认证页：[D:\Codex\ai_voice_assistant\apps\web\src\pages\AuthPage.vue](D:\Codex\ai_voice_assistant\apps\web\src\pages\AuthPage.vue)
- 应用首页：[D:\Codex\ai_voice_assistant\apps\web\src\pages\AppHomePage.vue](D:\Codex\ai_voice_assistant\apps\web\src\pages\AppHomePage.vue)
- API 层：[D:\Codex\ai_voice_assistant\apps\web\src\lib\api.ts](D:\Codex\ai_voice_assistant\apps\web\src\lib\api.ts)
- Session 层：[D:\Codex\ai_voice_assistant\apps\web\src\lib\session.ts](D:\Codex\ai_voice_assistant\apps\web\src\lib\session.ts)
