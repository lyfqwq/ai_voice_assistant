# 真实 SMTP / 模型接入说明

这份文档描述如何把当前本地 mock 依赖换成真实服务。

它只覆盖当前后端已经支持的环境变量和接入点，不扩展新能力。

## 1. 当前后端实际读取的配置

后端配置字段见：
- [apps/api/src/config/configuration.ts](D:\Codex\ai_voice_assistant\apps\api\src\config\configuration.ts)
- [apps/api/src/config/env.validation.ts](D:\Codex\ai_voice_assistant\apps\api\src\config\env.validation.ts)

当前必须配置的真实集成项：
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_FROM`
- `MODEL_BASE_URL`
- `MODEL_API_KEY`
- `MODEL_NAME`

可选但通常会用到：
- `SMTP_USER`
- `SMTP_PASS`

## 2. 真实 SMTP 接入

### 最小原则

当前后端走标准 SMTP 参数，不绑定某一家厂商 SDK。  
因此最稳妥的接入方式是使用“任何支持 SMTP relay 的邮件服务”。

### 你需要准备的内容

- SMTP host
- SMTP port
- SMTP username
- SMTP password 或 app password
- 发件人地址

### 推荐环境变量写法

```dotenv
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_FROM="AI Voice Assistant <no-reply@your-domain.com>"
```

### 常见端口建议

- `587`: 常见的 STARTTLS 提交端口
- `465`: 常见的 implicit TLS 端口
- `25`: 一般不推荐直接用于应用联调

具体该用哪个端口，以你的 SMTP 服务商提供的参数为准。

### 切换步骤

1. 停止使用本地 mock SMTP
2. 把 `.env` 里的 `SMTP_*` 改成真实值
3. 重启后端
4. 手动调用：
   - `POST /api/auth/send-code`
   - 检查真实邮箱是否收到验证码
   - 再调用 `POST /api/auth/verify-code`

### 联调建议

先只验证登录链路，不要一开始把 chat 一起混进来。  
这样你能更快判断问题到底在邮箱配置还是在其他模块。

### 排查方向

如果 `send-code` 失败，优先检查：
- SMTP host / port 是否正确
- 用户名密码是否正确
- 账号是否需要专用 app password
- 发件地址是否被服务商要求与认证账号或域名匹配
- 本机或服务器出站网络是否允许访问 SMTP 端口

## 3. 真实模型接入

### 当前模型接入方式

当前后端通过 OpenAI-compatible HTTP 接口访问模型服务。

需要配置：

```dotenv
MODEL_BASE_URL=https://your-model-provider.example.com/v1
MODEL_API_KEY=your-api-key
MODEL_NAME=deepseek-chat
```

这里的关键约束是：
- `MODEL_BASE_URL` 要指向兼容 OpenAI 风格接口的基础地址
- `MODEL_API_KEY` 不能为空
- `MODEL_NAME` 要和你在服务端实际可用的模型标识一致

### 切换步骤

1. 停止使用本地 mock model
2. 把 `.env` 里的 `MODEL_*` 改成真实值
3. 重启后端
4. 先跑一条最短 chat 请求：

```text
POST /api/conversations/:id/messages
```

建议先发一句很短的话，例如：
- `你好`
- `帮我练习一个英语开场`

### 联调建议

第一次接真实模型时，优先确认这 4 件事：
- 请求能成功返回 SSE 流
- `delta` 事件能持续输出
- `completed` 最终落完整 assistant 消息
- `conversation.updated` 能更新标题

### 排查方向

如果 chat 失败，优先检查：
- `MODEL_BASE_URL` 是否带了正确的 `/v1`
- `MODEL_API_KEY` 是否有效
- `MODEL_NAME` 是否真实存在
- 服务商是否支持流式输出
- 网络是否能访问对应域名

## 4. 推荐切换顺序

不要同时替换两个 mock。推荐顺序：

1. 保持 mock model，只切真实 SMTP
2. 登录链路跑通后，再切真实模型
3. 最后再把完整闭环跑一遍

这样如果失败，更容易定位问题来源。

## 5. 建议的真实联调流程

### 先验证 SMTP

```text
POST /api/auth/send-code
POST /api/auth/verify-code
GET /api/me
```

### 再验证 onboarding

```text
GET /api/learning-profile
PATCH /api/learning-profile
```

### 最后验证真实模型

```text
POST /api/conversations
POST /api/conversations/:id/messages
GET /api/conversations/:id/messages
GET /api/conversations
```

## 6. 什么时候继续保留 mock 更合适

如果你当前目标是：
- 开发前端页面
- 校验 Cookie
- 校验 SSE 事件处理
- 做最小闭环回归

那继续用 mock SMTP 和 mock model 通常更省时间。

如果你当前目标是：
- 做真实投递验证
- 验证供应商兼容性
- 评估真实响应质量或成本

那就切换到真实 SMTP 和真实模型。
