# 部署前检查清单

这份清单用于把当前本地已跑通的 MVP 整理到可部署状态。

目标不是直接给出 CI/CD 方案，而是减少“环境一换就挂”的风险。

## 1. 配置层

上线前确认：
- 已准备独立的生产环境 `.env`
- `SESSION_SECRET` 已替换为高强度随机值
- `DATABASE_URL` 指向正式数据库
- `SMTP_*` 已改成正式邮件服务
- `MODEL_*` 已改成正式模型服务
- 不再使用本地 mock 端口

推荐直接对照：
- [production-env.example](production-env.example)

## 2. 数据库层

上线前确认：
- PostgreSQL 已创建目标数据库
- 已执行 migration
- 没有启用 TypeORM schema auto sync
- 没有依赖本地开发数据

检查命令：

```powershell
corepack pnpm --filter @ai-voice-assistant/api migration:show
corepack pnpm --filter @ai-voice-assistant/api migration:run
```

## 3. 后端运行层

上线前确认：
- `corepack pnpm typecheck:api` 通过
- API 服务能启动
- `GET /api/health` 返回正常
- `POST /api/auth/send-code` 可调用
- `POST /api/auth/verify-code` 可调用
- `POST /api/conversations/:id/messages` 能拿到 SSE

## 4. 前端运行层

上线前确认：
- `corepack pnpm typecheck:web` 通过
- `corepack pnpm --filter @ai-voice-assistant/web build` 通过
- 前端对 `/api` 的访问路径与部署环境一致
- 浏览器端 Cookie 行为符合部署域名策略

## 5. 真实集成层

上线前至少再做一轮正式手工验收：
- 登录发码
- 验证码登录
- onboarding
- conversation 创建
- 第一条 chat
- SSE 流式返回
- conversation title 自动更新

## 6. 安全与稳定性

上线前确认：
- 不把真实密钥提交到仓库
- `.env` 不纳入版本控制
- 错误日志不输出敏感密钥
- session cookie 名称和 secret 已配置
- 失败时有基本排查日志

## 7. 建议的发布前命令

```powershell
corepack pnpm install
corepack pnpm typecheck:api
corepack pnpm typecheck:web
corepack pnpm --filter @ai-voice-assistant/web build
corepack pnpm --filter @ai-voice-assistant/api migration:run
```

## 8. 发布后首轮验收

部署完成后，优先人工检查：
- 健康检查
- 发码
- 验证码登录
- profile 读写
- 新建 conversation
- 首条 SSE chat

如果这 6 项都正常，说明 MVP 主链路基本稳定。
