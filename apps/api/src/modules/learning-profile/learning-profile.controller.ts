import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import {
  GetLearningProfileResponse,
  PatchLearningProfileResponse,
} from "@ai-voice-assistant/shared";
import { RequestUser } from "../../common/auth/request-user.interface";
import { CurrentUser } from "../auth/current-user.decorator";
import { SessionAuthGuard } from "../auth/session-auth.guard";
import { PatchLearningProfileDto } from "./dto/patch-learning-profile.dto";
import { LearningProfileService } from "./learning-profile.service";

@Controller("learning-profile")
@UseGuards(SessionAuthGuard)
export class LearningProfileController {
  constructor(private readonly learningProfileService: LearningProfileService) {}

  @Get()
  async getLearningProfile(
    @CurrentUser() user: RequestUser,
  ): Promise<GetLearningProfileResponse> {
    return this.learningProfileService.getLearningProfile(user.id);
  }

  @Patch()
  async patchLearningProfile(
    @CurrentUser() user: RequestUser,
    @Body() body: PatchLearningProfileDto,
  ): Promise<PatchLearningProfileResponse> {
    return this.learningProfileService.patchLearningProfile(user.id, body);
  }
}
