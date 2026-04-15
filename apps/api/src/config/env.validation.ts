import { plainToInstance } from "class-transformer";
import { IsInt, IsNotEmpty, IsString, Min, validateSync } from "class-validator";

class EnvironmentVariables {
  @IsString()
  @IsNotEmpty()
  NODE_ENV!: string;

  @IsInt()
  @Min(1)
  PORT!: number;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  SESSION_COOKIE_NAME!: string;

  @IsString()
  @IsNotEmpty()
  SESSION_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  SMTP_HOST!: string;

  @IsInt()
  @Min(1)
  SMTP_PORT!: number;

  @IsString()
  SMTP_USER!: string;

  @IsString()
  SMTP_PASS!: string;

  @IsString()
  @IsNotEmpty()
  SMTP_FROM!: string;

  @IsString()
  @IsNotEmpty()
  MODEL_BASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  MODEL_API_KEY!: string;

  @IsString()
  @IsNotEmpty()
  MODEL_NAME!: string;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(`Environment validation failed: ${errors.toString()}`);
  }

  return validatedConfig;
}
