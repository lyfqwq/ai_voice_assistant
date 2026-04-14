export interface AppConfig {
  nodeEnv: string;
  port: number;
  databaseUrl: string;
  sessionCookieName: string;
  sessionSecret: string;
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
  modelBaseUrl: process.env.MODEL_BASE_URL ?? "",
  modelApiKey: process.env.MODEL_API_KEY ?? "",
  modelName: process.env.MODEL_NAME ?? "deepseek-chat",
});

