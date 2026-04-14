import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import configuration from "./config/configuration";
import { validateEnv } from "./config/env.validation";
import { DatabaseModule } from "./common/database/database.module";
import { AppLoggerService } from "./common/logger/app-logger.service";
import { HealthModule } from "./modules/health/health.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      validate: validateEnv,
    }),
    DatabaseModule,
    HealthModule,
  ],
  providers: [AppLoggerService],
})
export class AppModule {}

