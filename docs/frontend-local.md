# 前端联调说明

这份文档只说明前端如何对接当前已经跑通的后端闭环。

先说明当前状态：
- [apps/web/package.json](D:\Codex\ai_voice_assistant\apps\web\package.json) 还只是基础 scaffold
- [apps/web/src/main.ts](D:\Codex\ai_voice_assistant\apps\web\src\main.ts) 目前没有真实页面逻辑

所以这里的“前端联调”指的是：
- 前端开发时如何连接本地后端
- 当前后端接口如何组织
- 登录态、Cookie、SSE 在浏览器侧要注意什么

## 1. 本地联调目标

当前后端已可用于前端联调的能力：
- 邮箱验证码登录
- 读取当前用户
- onboarding 读写 `learning-profile`
- 会话创建与列表查询
- 消息历史查询
- chat SSE 最小闭环

接口范围：
- `POST /api/auth/send-code`
- `POST /api/auth/verify-code`
- `POST /api/auth/logout`
- `GET /api/me`
- `GET /api/learning-profile`
- `PATCH /api/learning-profile`
- `POST /api/conversations`
- `GET /api/conversations`
- `GET /api/conversations/:id/messages`
- `POST /api/conversations/:id/messages`

## 2. 推荐本地启动方式

先启动后端：

```powershell
cd "D:\Codex\ai_voice_assistant"
corepack pnpm dev:api
```

后端健康检查：

```text
http://127.0.0.1:3000/api/health
```

如果后面开始补 `apps/web` 的真实页面，建议本地前端开发服务器使用独立端口，例如 `5173`。

## 3. 浏览器侧的关键约束

### 认证方式

当前后端使用的是：
- server-side session
- `HttpOnly` cookie

前端这边要记住两点：
- 不要自行保存 JWT
- 所有需要登录态的请求都要带 `credentials`

如果你用 `fetch`：

```ts
fetch("http://127.0.0.1:3000/api/me", {
  credentials: "include",
});
```

如果你用 `axios`，要开启 `withCredentials: true`。

### 开发期跨域

当前仓库还没有单独补前端 dev server 的代理配置文档，所以最稳妥的本地联调方案有两种：
- 前端 dev server 配代理，把 `/api` 代理到 `http://127.0.0.1:3000`
- 或者前端直接请求后端完整地址，并确保请求带 cookie

如果开始做真实前端，推荐优先走“开发代理”，这样 Cookie、SSE 和路径都更省心。

## 4. 推荐前端对接顺序

### Step 1: 登录

1. 调 `POST /api/auth/send-code`
2. 输入验证码后调 `POST /api/auth/verify-code`
3. 成功后立刻调 `GET /api/me`

页面侧建议：
- `verify-code` 成功后，不要只依赖接口返回体，立即再请求一次 `/api/me`
- 以 `/api/me` 为准决定是否进入 onboarding 或主会话区

### Step 2: onboarding

1. 调 `GET /api/learning-profile`
2. 如果 `profile` 为 `null`，进入 onboarding
3. 提交时调 `PATCH /api/learning-profile`

当前后端约束：
- `learning_profiles` 在 onboarding 完成后创建
- 不是注册时预创建

### Step 3: conversation list

进入主界面后：
- 调 `GET /api/conversations`
- 点击“新对话”时调 `POST /api/conversations`
- 打开某个会话后调 `GET /api/conversations/:id/messages`

### Step 4: chat SSE

发送消息时调：
- `POST /api/conversations/:id/messages`

请求头：
- `Content-Type: application/json`
- `Accept: text/event-stream`

请求体：

```json
{
  "content": "帮我练习一个英语自我介绍开场"
}
```

## 5. SSE 事件处理约定

当前后端只支持这些事件：
- `ack`
- `delta`
- `completed`
- `conversation.updated`
- `profile.updated`
- `error`
- `done`

推荐前端处理方式：

### `ack`

用于建立当前请求和消息占位的绑定关系。

前端可以在这里：
- 创建一条 assistant 占位消息
- 记录 `assistantMessageId`
- 立刻把用户消息插入本地列表

### `delta`

只用于流式展示，不要把它当成最终落库结果。

前端可以：
- 通过 `assistantMessageId` 追加展示文本
- 自动滚动到底部

### `completed`

把占位中的 assistant 消息替换成最终完整消息。

### `conversation.updated`

用于刷新：
- `title`
- `summary`
- `messageCount`
- `lastMessageAt`

首轮消息完成后，标题可能从 `新对话` 变成真正标题，前端要用这个事件刷新列表与当前 header。

### `profile.updated`

这是可选事件。

前端如果当前页面展示了学习画像摘要，可以局部刷新；如果没有，也可以先忽略。

### `error`

显示可重试错误提示，并结束当前流式发送态。

### `done`

把“正在生成”状态关闭。

## 6. 前端本地联调建议

推荐先做这 4 条最小链路，不要一开始铺太多页面：
- 登录页
- onboarding 页
- conversation list
- chat detail

最小联调验收建议：
- 登录后能读到 `/api/me`
- onboarding 提交后再次读取 `/api/learning-profile` 能看到刚写入的数据
- 新建 conversation 后列表立即出现一条 `新对话`
- 首轮 chat 完成后，列表标题被 `conversation.updated` 刷新
- 消息页能看到 user/assistant 两条消息

## 7. 当前不应假设前端已具备的能力

目前不要在前端文档里默认这些已经有：
- 现成的 Vue Router 页面流
- API SDK 封装
- 全局登录态 store
- SSE composable
- Vite 代理配置

这些都还需要后续前端实现时再落代码。
