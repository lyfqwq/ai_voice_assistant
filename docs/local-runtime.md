# 本地运行说明

这份文档说明如何在本地跑通当前仓库已经完成的 MVP 闭环。

只覆盖当前已实现能力，不扩展到 V2。

## 目标

本地跑通以下链路：
- 健康检查
- 邮箱验证码登录
- onboarding 创建 `learning_profiles`
- conversation 创建与查询
- chat SSE 最小闭环
- 首轮回复后自动生成标题

## 前置条件

本地需要具备：
- `Node.js`
- `corepack`
- `pnpm`
- `PostgreSQL`
- `Python`

推荐在仓库根目录 `D:\Codex\ai_voice_assistant` 执行所有命令。

## 1. 安装依赖

```powershell
corepack pnpm install
```

## 2. 准备环境变量

先复制模板：

```powershell
Copy-Item .env.example .env
```

本地最小示例：

```dotenv
NODE_ENV=development
PORT=3000
WEB_PORT=5173
DATABASE_URL=postgres://postgres:postgres@localhost:5432/ai_voice_assistant
SESSION_COOKIE_NAME=ai_voice_assistant_session
SESSION_SECRET=replace-this-with-a-long-random-string
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_FROM="AI Voice Assistant <no-reply@example.com>"
MODEL_BASE_URL=http://127.0.0.1:18080/v1
MODEL_API_KEY=local-dev-key
MODEL_NAME=deepseek-chat
```

说明：
- 本地 smoke 会临时拉起 mock SMTP 和 mock model
- `.env` 里的数据库配置必须是真实可连接的

## 3. 准备数据库

创建数据库后执行 migration：

```powershell
corepack pnpm --filter @ai-voice-assistant/api migration:run
```

可选检查：

```powershell
corepack pnpm --filter @ai-voice-assistant/api migration:show
```

## 4. 启动服务

终端 1：

```powershell
corepack pnpm dev:api
```

终端 2：

```powershell
corepack pnpm dev:web
```

可访问：
- 后端健康检查：`http://127.0.0.1:3000/api/health`
- 前端页面：`http://127.0.0.1:5173`

## 5. 正式验证入口

后端正式验证：

```powershell
.\scripts\validate-phase-6.ps1
```

单独跑 runtime smoke：

```powershell
.\scripts\validate-runtime-smoke.ps1
```

英文场景：

```powershell
.\scripts\local\runtime-smoke.ps1 -Scenario en
```

中文场景：

```powershell
.\scripts\local\runtime-smoke.ps1 -Scenario zh
```

## 6. 成功标准

成功时应至少看到：
- `Workspace check passed.`
- `typecheck:api` 通过
- `Validate runtime smoke`
- `English smoke passed.`
- `Chinese smoke passed.`
- `Runtime smoke validation passed.`
- `Phase 6 validation passed.`

## 7. 常见问题

### `API not ready within timeout`

优先检查：
- PostgreSQL 是否启动
- `.env` 中的 `DATABASE_URL` 是否正确
- 3000 端口是否被占用

### `EMAIL_SEND_FAILED`

本地 smoke 下优先检查：
- `python` 是否可执行
- mock SMTP 是否成功启动

真实 SMTP 下优先检查：
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

### typecheck 失败

重新执行：

```powershell
corepack pnpm install
corepack pnpm typecheck:api
corepack pnpm typecheck:web
```

### 前端打开但接口失败

优先检查：
- 后端是否正常启动
- `http://127.0.0.1:3000/api/health` 是否正常
- `http://127.0.0.1:5173/api/health` 是否能通过代理访问

## 8. 相关文档

- 前端联调：[frontend-local.md](frontend-local.md)
- 真实服务接入：[real-integrations.md](real-integrations.md)
- 真实验证结果：[integration-report.md](integration-report.md)
- 部署前检查：[deployment-checklist.md](deployment-checklist.md)
