import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { join } from "node:path";
import configuration from "./config/configuration";
import { validateEnv } from "./config/env.validation";
import { DatabaseModule } from "./common/database/database.module";
import { MailModule } from "./common/mail/mail.module";
import { AppLoggerService } from "./common/logger/app-logger.service";
import { AuthModule } from "./modules/auth/auth.module";
import { ChatModule } from "./modules/chat/chat.module";
import { ConversationsModule } from "./modules/conversations/conversations.module";
import { HealthModule } from "./modules/health/health.module";
import { LearningProfileModule } from "./modules/learning-profile/learning-profile.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: [
        join(process.cwd(), "../../.env.local"),
        join(process.cwd(), "../../.env"),
        join(process.cwd(), ".env.local"),
        join(process.cwd(), ".env"),
      ],
      load: [configuration],
      validate: validateEnv,
    }),
    DatabaseModule,
    MailModule,
    AuthModule,
    ChatModule,
    ConversationsModule,
    HealthModule,
    LearningProfileModule,
  ],
  providers: [AppLoggerService],
})
export class AppModule {}
