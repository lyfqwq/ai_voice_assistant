# 真实 SMTP / 模型接入说明

这份文档说明如何把当前仓库从本地 mock 依赖切换到真实服务。

只覆盖当前后端已经支持的接入点，不扩展新能力。

## 当前后端实际读取的配置

后端配置入口见：
- [D:\Codex\ai_voice_assistant\apps\api\src\config\configuration.ts](D:\Codex\ai_voice_assistant\apps\api\src\config\configuration.ts)
- [D:\Codex\ai_voice_assistant\apps\api\src\config\env.validation.ts](D:\Codex\ai_voice_assistant\apps\api\src\config\env.validation.ts)

真实集成相关的核心环境变量：
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_FROM`
- `SMTP_USER`
- `SMTP_PASS`
- `MODEL_BASE_URL`
- `MODEL_API_KEY`
- `MODEL_NAME`

## 1. 真实 SMTP 接入

### 最小原则

当前后端走标准 SMTP 参数，不绑定某一家服务商 SDK。

因此只要服务商支持 SMTP relay，就可以接入。

### 建议配置

```dotenv
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_FROM="AI Voice Assistant <no-reply@your-domain.com>"
```

### 常见端口

- `587`: 常见 STARTTLS 提交端口
- `465`: 常见 implicit TLS 端口
- `25`: 一般不推荐直接用于应用联调

### 切换步骤

1. 停止使用本地 mock SMTP
2. 把 `.env` 中的 `SMTP_*` 改成真实值
3. 重启后端
4. 手动调用：
   - `POST /api/auth/send-code`
   - `POST /api/auth/verify-code`
   - `GET /api/me`

### 排查方向

如果 `send-code` 失败，优先检查：
- `SMTP_HOST` 和 `SMTP_PORT`
- `SMTP_USER` / `SMTP_PASS`
- 服务商是否要求专用 app password
- `SMTP_FROM` 是否符合服务商要求
- 服务器是否允许访问对应 SMTP 端口

## 2. 真实模型接入

### 当前接入方式

当前后端通过 OpenAI-compatible HTTP 接口访问模型服务。

推荐配置：

```dotenv
MODEL_BASE_URL=https://your-provider.example.com/v1
MODEL_API_KEY=your-api-key
MODEL_NAME=deepseek-chat
```

约束：
- `MODEL_BASE_URL` 要指向兼容 OpenAI 风格接口的基础地址
- `MODEL_API_KEY` 不能为空
- `MODEL_NAME` 要与真实服务端可用模型名一致

### 切换步骤

1. 停止使用本地 mock model
2. 把 `.env` 中的 `MODEL_*` 改成真实值
3. 重启后端
4. 先发一条最短 chat 请求验证 SSE

建议先发短 prompt，比如：
- `你好`
- `Help me practice an interview introduction.`

### 排查方向

如果 chat 失败，优先检查：
- `MODEL_BASE_URL` 是否正确
- `MODEL_API_KEY` 是否有效
- `MODEL_NAME` 是否存在
- 服务商是否支持流式输出
- 当前网络是否能访问模型域名

## 3. 推荐切换顺序

不要同时替换两个 mock，推荐顺序：

1. 先保持 mock model，只切真实 SMTP
2. 登录链路跑通后，再切真实模型
3. 最后把完整闭环跑一遍

这样更容易定位问题来源。

## 4. 建议的真实联调流程

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

## 5. 当前仓库已经验证过什么

已经完成过一轮真实集成验证：
- 真实 SMTP 发信成功
- 真实模型请求成功
- 真实验证码登录成功
- 真实 conversation 创建成功
- 真实 SSE chat 成功
- 标题自动生成成功

详细结果见：
- [integration-report.md](integration-report.md)
