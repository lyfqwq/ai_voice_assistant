# 本地联调说明

这份文档只描述当前已经跑通的后端最小闭环联调，不扩展到 V2 功能。

## 目标

跑通以下真实链路：
- 健康检查
- 邮箱验证码登录
- onboarding 创建 `learning_profiles`
- conversation 创建与查询
- chat SSE 最小闭环
- 首轮回复后自动生成标题

## 前置条件

需要本地具备：
- `Node.js`
- `corepack`
- `pnpm`
- `Python`
- `PostgreSQL`

推荐在仓库根目录 `D:\Codex\ai_voice_assistant` 下执行所有命令。

## 1. 安装依赖

```powershell
corepack pnpm install
```

## 2. 配置环境变量

先复制模板：

```powershell
Copy-Item .env.example .env
```

本地 smoke 推荐最小配置：

```dotenv
NODE_ENV=development
PORT=3000
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
- 本地 smoke 启动时会覆盖 `SMTP_PORT` 和 `MODEL_BASE_URL` 到临时 mock 端口。
- `.env` 里的 PostgreSQL 连接信息需要真实可用。

## 3. 准备数据库

创建数据库后执行 migration：

```powershell
corepack pnpm --filter @ai-voice-assistant/api migration:run
```

可选检查：

```powershell
corepack pnpm --filter @ai-voice-assistant/api migration:show
```

## 4. 运行正式验证

### 方式 A：直接跑 Phase 6 验证

```powershell
.\scripts\validate-phase-6.ps1
```

这会自动执行：
- `node scripts/check-workspace.mjs`
- `corepack pnpm install`
- `corepack pnpm typecheck:api`
- `.\scripts\validate-runtime-smoke.ps1`

### 方式 B：单独跑 runtime smoke

英文场景：

```powershell
.\scripts\local\runtime-smoke.ps1 -Scenario en
```

中文场景：

```powershell
.\scripts\local\runtime-smoke.ps1 -Scenario zh
```

正式 smoke 包装脚本：

```powershell
.\scripts\validate-runtime-smoke.ps1
```

它会：
- 先跑英文场景
- 再跑中文场景
- 校验 SSE 事件顺序
- 校验 onboarding 创建
- 校验消息整条落库
- 校验标题自动生成

## 5. Smoke 内部依赖

本地 smoke 会自动拉起：
- [scripts/local/mock_smtp.py](D:\Codex\ai_voice_assistant\scripts\local\mock_smtp.py)
- [scripts/local/mock_model.py](D:\Codex\ai_voice_assistant\scripts\local\mock_model.py)
- `apps/api` 本地服务

因此你通常不需要手动先开 API。

## 6. 成功标准

通过时应至少看到：
- `Validate runtime smoke`
- `English smoke passed.`
- `Chinese smoke passed.`
- `Runtime smoke validation passed.`
- `Phase 6 validation passed.`

并且中文场景里，返回事件顺序应为：

```text
ack
delta
delta
delta
completed
conversation.updated
profile.updated
done
```

## 7. 常见问题

### `API not ready within timeout`

通常表示：
- PostgreSQL 未启动
- `.env` 中 `DATABASE_URL` 不可用
- `3000` 端口被占用

### `Verification code not captured from SMTP inbox`

通常表示本地 mock SMTP 启动偏慢。当前正式验证已经带重试；如果仍持续失败，优先检查：
- 本机 `python` 是否可执行
- 本地安全软件是否拦截临时监听端口

### `EMAIL_SEND_FAILED`

如果是直接跑业务接口，说明 SMTP 配置不可用。  
如果是跑本地 smoke，优先检查 mock SMTP 是否被成功拉起。

### typecheck 失败

先重新执行：

```powershell
corepack pnpm install
corepack pnpm typecheck:api
```

如果依旧失败，再检查 workspace 安装是否完整。

## 8. 目前不在这份联调里的内容

以下内容当前不属于已验证闭环：
- 前端页面联调
- 真实邮件服务接入
- 真实模型服务接入
- 文件上传、知识库、工具调用
- 多端同步
