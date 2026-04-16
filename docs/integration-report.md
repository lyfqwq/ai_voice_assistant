# 真实集成验证报告

更新时间：2026-04-16

这份文档记录当前仓库已经完成的真实集成验证结果，目的是回答两个问题：
- 现在系统到底有没有跑通
- 跑通到了哪一层

## 验证范围

本次验证覆盖：
- 真实 SMTP
- 真实模型服务
- 后端本地服务
- 前端本地服务
- 前后端代理联调
- 登录到聊天的最小真实用户链路

## 已确认通过的项

### 1. 后端服务

已确认：
- `corepack pnpm dev:api` 可启动
- `GET /api/health` 返回 `ok`

### 2. 前端服务

已确认：
- `corepack pnpm dev:web` 可启动
- `http://127.0.0.1:5173` 可访问
- `http://127.0.0.1:5173/api/health` 通过前端代理返回 `ok`

### 3. 真实 SMTP

已确认：
- `POST /api/auth/send-code` 可成功调用
- 验证码邮件可发送到 Mailtrap sandbox

结论：
- 真实 SMTP 发信正常

### 4. 真实模型

已确认：
- 使用当前 `.env` 中的模型配置可以直接请求模型服务
- 模型可返回正常内容

结论：
- 真实模型服务可用

### 5. 真实验证码登录

已确认：
- `POST /api/auth/verify-code` 成功
- `GET /api/me` 成功

结论：
- 真实 server-side session + HttpOnly cookie 链路正常

### 6. onboarding

已确认：
- `GET /api/learning-profile` 成功
- `PATCH /api/learning-profile` 成功

结论：
- learning profile 读写正常

### 7. conversations

已确认：
- `POST /api/conversations` 成功
- `GET /api/conversations` 成功
- `GET /api/conversations/:id/messages` 成功

结论：
- 会话创建与历史查询正常

### 8. 真实聊天 SSE

已确认：
- `POST /api/conversations/:id/messages` 成功
- 实际收到完整 SSE 事件序列：
  - `ack`
  - `delta`
  - `completed`
  - `conversation.updated`
  - `profile.updated`
  - `done`

另外已确认：
- assistant 回复按流式返回
- assistant 消息最终完整落库
- conversation title 在首轮聊天后被自动更新
- `profile.updated` 返回了画像增量更新结果

结论：
- 真实聊天主链路正常

## 当前结论

如果按“MVP 最小闭环是否跑通”来判断，当前结论是：

- 后端：跑通
- 前端：跑通
- 真实 SMTP：跑通
- 真实模型：跑通
- 登录到聊天的真实主链路：跑通

也就是说，项目现在已经不是“只能本地 mock 演示”的状态，而是已经完成过一轮真实依赖联调。

## 本次验证里的注意点

### 1. PowerShell 中文编码

通过命令行直接发送中文 JSON 时，当前 Windows PowerShell 控制台出现过编码问题。

影响：
- 命令行直连 API 时，中文字段可能在控制台里显示异常

不影响：
- 浏览器里的前端页面联调
- Vite 前端的 UTF-8 请求链路
- 后端本身的业务逻辑

建议：
- 浏览器联调时优先走前端页面
- 脚本联调时尽量显式用 UTF-8

### 2. 验证码一次性消费

验证码在成功 `verify-code` 后会立即失效。

这不是问题，而是符合设计预期。做手工联调时，如果要重复验证登录，需要重新触发一次 `send-code`。

## 建议的下一步

最自然的后续工作：
- 准备部署环境
- 把 `.env` 从本地开发配置整理成生产模板
- 做一次部署前 checklist 走查

对应文档：
- [deployment-checklist.md](deployment-checklist.md)
- [production-env.example](production-env.example)
