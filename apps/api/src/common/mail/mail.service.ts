import { Injectable, HttpStatus } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createTransport, Transporter } from "nodemailer";
import { AppHttpException } from "../errors/app-http.exception";

@Injectable()
export class MailService {
  private readonly transporter: Transporter;
  private readonly smtpFrom: string;

  constructor(private readonly configService: ConfigService) {
    const smtpUser = this.configService.get<string>("smtpUser") ?? "";
    const smtpPass = this.configService.get<string>("smtpPass") ?? "";

    this.transporter = createTransport({
      host: this.configService.getOrThrow<string>("smtpHost"),
      port: this.configService.getOrThrow<number>("smtpPort"),
      secure: false,
      auth: smtpUser
        ? {
            user: smtpUser,
            pass: smtpPass,
          }
        : undefined,
    });

    this.smtpFrom = this.configService.getOrThrow<string>("smtpFrom");
  }

  async sendLoginCode(email: string, code: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.smtpFrom,
        to: email,
        subject: "Your AI Voice Assistant login code",
        text: [
          "Your verification code is:",
          code,
          "",
          "The code will expire in 10 minutes.",
        ].join("\n"),
      });
    } catch (error) {
      throw new AppHttpException(
        "EMAIL_SEND_FAILED",
        "验证码发送失败，请稍后重试",
        HttpStatus.SERVICE_UNAVAILABLE,
        error instanceof Error ? error.message : null,
      );
    }
  }
}
