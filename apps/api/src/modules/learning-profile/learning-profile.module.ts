import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { LearningProfileController } from "./learning-profile.controller";
import { LearningProfileService } from "./learning-profile.service";

@Module({
  imports: [AuthModule],
  controllers: [LearningProfileController],
  providers: [LearningProfileService],
})
export class LearningProfileModule {}
