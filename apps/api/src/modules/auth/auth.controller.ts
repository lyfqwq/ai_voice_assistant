import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Response } from "express";
import { MeResponse, SendCodeResponse, VerifyCodeResponse } from "@ai-voice-assistant/shared";
import { CurrentUser } from "./current-user.decorator";
import { AuthService } from "./auth.service";
import { SendCodeDto } from "./dto/send-code.dto";
import { VerifyCodeDto } from "./dto/verify-code.dto";
import { SessionAuthGuard } from "./session-auth.guard";
import { RequestUser } from "../../common/auth/request-user.interface";

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("auth/send-code")
  @HttpCode(HttpStatus.ACCEPTED)
  async sendCode(@Body() body: SendCodeDto): Promise<SendCodeResponse> {
    return this.authService.sendCode(body.email);
  }

  @Post("auth/verify-code")
  async verifyCode(
    @Body() body: VerifyCodeDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<VerifyCodeResponse> {
    return this.authService.verifyCode(body.email, body.code, response);
  }

  @Post("auth/logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.authService.logout(response);
  }

  @Get("me")
  @UseGuards(SessionAuthGuard)
  async me(@CurrentUser() user: RequestUser): Promise<MeResponse> {
    return {
      user,
    };
  }
}
