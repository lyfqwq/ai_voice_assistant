# AI Voice Assistant

一个面向学习陪练场景的 AI 聊天助手 MVP 仓库。

当前仓库已经跑通的最小后端闭环包括：
- 邮箱验证码登录
- `learning-profile` onboarding
- 新建与查询 conversations
- `POST /conversations/:id/messages` 的最小 SSE 聊天链路
- 首轮 assistant 回复后自动生成 conversation title

## 技术栈

- Monorepo: `pnpm`
- Backend: `NestJS` + `TypeScript` + `TypeORM` + `PostgreSQL`
- Frontend: `Vue 3` + `Vite` + `TypeScript`
- Shared contracts: `packages/shared`

## 仓库结构

```text
apps/
  api/        NestJS 后端
  web/        Vue 前端
packages/
  shared/     共享 contracts 与类型
scripts/      验证与自动化脚本
```

## 当前可用命令

在仓库根目录 `D:\Codex\ai_voice_assistant` 下执行：

```powershell
corepack pnpm install
corepack pnpm typecheck:api
corepack pnpm dev:api
```

后端 migration 命令：

```powershell
corepack pnpm --filter @ai-voice-assistant/api migration:show
corepack pnpm --filter @ai-voice-assistant/api migration:run
corepack pnpm --filter @ai-voice-assistant/api migration:revert
```

## 环境变量

先复制：

```powershell
Copy-Item .env.example .env
```

最小必填项见 [`.env.example`](D:\Codex\ai_voice_assistant\.env.example)：
- `DATABASE_URL`
- `SESSION_SECRET`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_FROM`
- `MODEL_BASE_URL`
- `MODEL_API_KEY`
- `MODEL_NAME`

说明：
- 本地联调可以使用 mock SMTP 和 mock model，不要求一开始就连真实外部服务。
- 后端当前会显式读取仓库根目录 `.env`。

## 快速验证

基础静态验证：

```powershell
node scripts/check-workspace.mjs
corepack pnpm install
corepack pnpm typecheck:api
```

Phase 6 正式联调验证：

```powershell
.\scripts\validate-phase-6.ps1
```

这个验证脚本会串起：
- workspace 检查
- `pnpm install`
- `typecheck:api`
- 本地 runtime smoke

## 本地联调

更完整的本地联调说明见 [docs/local-runtime.md](D:\Codex\ai_voice_assistant\docs\local-runtime.md)。
前端对接说明见 [docs/frontend-local.md](D:\Codex\ai_voice_assistant\docs\frontend-local.md)。
真实 SMTP / 模型接入说明见 [docs/real-integrations.md](D:\Codex\ai_voice_assistant\docs\real-integrations.md)。

如果你只想快速跑一遍：

```powershell
.\scripts\local\runtime-smoke.ps1 -Scenario en
.\scripts\local\runtime-smoke.ps1 -Scenario zh
```

## 当前闭环覆盖范围

已经覆盖：
- `GET /api/health`
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

当前 SSE 事件范围固定为：
- `ack`
- `delta`
- `completed`
- `conversation.updated`
- `profile.updated`
- `error`
- `done`

## 已知前提

- 运行时验证依赖本地 PostgreSQL。
- `send-code` 需要可用 SMTP；本地 smoke 默认会启 mock SMTP。
- chat 需要模型端点；本地 smoke 默认会启 mock model。
- 目前文档以 Windows PowerShell 运行方式为主。
- `apps/web` 现在已经具备 auth、onboarding、conversations 和最小 SSE chat 前端闭环，并补上了基础 loading / empty / retry polish；当前主要剩余的是更细的体验打磨，不是主链路缺失。
