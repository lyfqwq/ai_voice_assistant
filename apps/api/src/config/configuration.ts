export interface AppConfig {
  nodeEnv: string;
  port: number;
  databaseUrl: string;
  sessionCookieName: string;
  sessionSecret: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
  modelBaseUrl: string;
  modelApiKey: string;
  modelName: string;
}

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL ?? "",
  sessionCookieName: process.env.SESSION_COOKIE_NAME ?? "ai_voice_assistant_session",
  sessionSecret: process.env.SESSION_SECRET ?? "",
  smtpHost: process.env.SMTP_HOST ?? "",
  smtpPort: Number(process.env.SMTP_PORT ?? 1025),
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPass: process.env.SMTP_PASS ?? "",
  smtpFrom: process.env.SMTP_FROM ?? "",
  modelBaseUrl: process.env.MODEL_BASE_URL ?? "",
  modelApiKey: process.env.MODEL_API_KEY ?? "",
  modelName: process.env.MODEL_NAME ?? "deepseek-chat",
});
