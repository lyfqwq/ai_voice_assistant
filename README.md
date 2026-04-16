# AI Voice Assistant

面向学习陪练场景的 AI 聊天助手 MVP。

当前仓库已经跑通的最小闭环包括：
- 邮箱验证码登录
- `learning-profile` onboarding
- conversation 创建与历史查询
- `POST /conversations/:id/messages` 的 SSE 聊天链路
- 首轮 assistant 回复后自动生成 conversation title
- Vue 前端登录、onboarding、会话列表、消息历史与流式聊天界面

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
docs/         联调、部署与交付文档
```

## 当前状态

后端已经完成并验证：
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

前端已经完成并验证：
- 登录页
- 验证码输入与 resend 倒计时
- `/me` 恢复登录态
- onboarding 表单
- conversation list
- message history
- SSE assistant 流式展示
- 失败重试、基础 loading / empty / error 状态

真实集成已经验证通过：
- 真实 SMTP 发信
- 真实模型调用
- 真实验证码登录
- 真实 conversation 创建
- 真实 SSE chat 与标题自动生成

详细结果见：
- [docs/integration-report.md](docs/integration-report.md)

## 常用命令

在仓库根目录 `D:\Codex\ai_voice_assistant` 下执行：

```powershell
corepack pnpm install
corepack pnpm typecheck:api
corepack pnpm typecheck:web
corepack pnpm dev:api
corepack pnpm dev:web
```

数据库 migration：

```powershell
corepack pnpm --filter @ai-voice-assistant/api migration:show
corepack pnpm --filter @ai-voice-assistant/api migration:run
corepack pnpm --filter @ai-voice-assistant/api migration:revert
```

## 环境变量

先复制模板：

```powershell
Copy-Item .env.example .env
```

本地开发最少需要：
- `DATABASE_URL`
- `SESSION_SECRET`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_FROM`
- `MODEL_BASE_URL`
- `MODEL_API_KEY`
- `MODEL_NAME`

如果要做真实服务联调或部署准备，参考：
- [docs/real-integrations.md](docs/real-integrations.md)
- [docs/production-env.example](docs/production-env.example)

## 验证入口

基础验证：

```powershell
node scripts/check-workspace.mjs
corepack pnpm install
corepack pnpm typecheck:api
corepack pnpm typecheck:web
```

后端正式运行时验证：

```powershell
.\scripts\validate-phase-6.ps1
```

本地 smoke：

```powershell
.\scripts\local\runtime-smoke.ps1 -Scenario en
.\scripts\local\runtime-smoke.ps1 -Scenario zh
.\scripts\validate-runtime-smoke.ps1
```

## 文档索引

- 本地运行说明：[docs/local-runtime.md](docs/local-runtime.md)
- 前端联调说明：[docs/frontend-local.md](docs/frontend-local.md)
- 真实 SMTP / 模型接入：[docs/real-integrations.md](docs/real-integrations.md)
- 真实集成结果报告：[docs/integration-report.md](docs/integration-report.md)
- 部署前检查清单：[docs/deployment-checklist.md](docs/deployment-checklist.md)
- 生产环境变量模板：[docs/production-env.example](docs/production-env.example)

## 当前未覆盖范围

当前仍不在 MVP 已验证范围内：
- 文件上传
- 知识库
- 工具调用
- 多端实时同步
- 管理后台
- 生产部署脚本与 CI/CD
