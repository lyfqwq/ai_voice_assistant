import { randomBytes, randomInt, createHash, timingSafeEqual } from "node:crypto";
import {
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectDataSource } from "@nestjs/typeorm";
import { Response } from "express";
import { DataSource } from "typeorm";
import { RequestUser } from "../../common/auth/request-user.interface";
import { AppHttpException } from "../../common/errors/app-http.exception";
import { MailService } from "../../common/mail/mail.service";
import { SendCodeResponse, VerifyCodeResponse } from "@ai-voice-assistant/shared";

interface VerificationCodeRow {
  id: string;
  code_hash: string;
  expires_at: string;
  attempt_count: number;
  last_sent_at: string;
}

interface UserRow {
  id: string;
  email: string;
  onboarding_completed: boolean;
}

interface SessionRow extends UserRow {
  auth_session_id: string;
}

interface CookieOptions {
  httpOnly: boolean;
  sameSite: "lax";
  secure: boolean;
  path: string;
  expires?: Date;
  maxAge?: number;
}

@Injectable()
export class AuthService {
  private static readonly LOGIN_PURPOSE = "login";
  private static readonly RESEND_AFTER_SECONDS = 60;
  private static readonly CODE_EXPIRES_MINUTES = 10;
  private static readonly MAX_ATTEMPTS = 5;
  private static readonly SESSION_EXPIRES_DAYS = 30;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  async sendCode(emailInput: string): Promise<SendCodeResponse> {
    const email = this.normalizeEmail(emailInput);
    const latestCode = await this.getLatestVerificationCode(email);
    const now = new Date();

    if (latestCode) {
      const resendAvailableAt = new Date(latestCode.last_sent_at).getTime()
        + AuthService.RESEND_AFTER_SECONDS * 1000;
      const retryAfterSeconds = Math.ceil((resendAvailableAt - now.getTime()) / 1000);

      if (retryAfterSeconds > 0) {
        throw new AppHttpException(
          "CODE_RATE_LIMITED",
          "验证码发送过于频繁，请稍后重试",
          HttpStatus.TOO_MANY_REQUESTS,
          { resendAfterSeconds: retryAfterSeconds },
        );
      }
    }

    const code = this.generateVerificationCode();
    const codeHash = this.hashVerificationCode(email, code);
    const expiresAt = new Date(now.getTime() + AuthService.CODE_EXPIRES_MINUTES * 60 * 1000);

    const insertedRows = await this.dataSource.query<[{ id: string }]>(
      `
        INSERT INTO email_verification_codes (email, purpose, code_hash, expires_at, last_sent_at)
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING id
      `,
      [email, AuthService.LOGIN_PURPOSE, codeHash, expiresAt.toISOString()],
    );

    try {
      await this.mailService.sendLoginCode(email, code);
    } catch (error) {
      await this.dataSource.query(
        `DELETE FROM email_verification_codes WHERE id = $1`,
        [insertedRows[0].id],
      );
      throw error;
    }

    return {
      ok: true,
      resendAfterSeconds: AuthService.RESEND_AFTER_SECONDS,
    };
  }

  async verifyCode(
    emailInput: string,
    code: string,
    response: Response,
  ): Promise<VerifyCodeResponse> {
    const email = this.normalizeEmail(emailInput);
    const verificationCode = await this.getLatestVerificationCode(email);

    if (!verificationCode || this.isExpired(verificationCode.expires_at)) {
      throw new AppHttpException(
        "INVALID_CODE",
        "验证码错误或已过期",
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (verificationCode.attempt_count >= AuthService.MAX_ATTEMPTS) {
      throw new AppHttpException(
        "TOO_MANY_ATTEMPTS",
        "验证码错误次数过多，请重新获取验证码",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const actualHash = this.hashVerificationCode(email, code);
    const hashesMatch = this.areHashesEqual(verificationCode.code_hash, actualHash);

    if (!hashesMatch) {
      await this.dataSource.query(
        `
          UPDATE email_verification_codes
          SET attempt_count = attempt_count + 1
          WHERE id = $1
        `,
        [verificationCode.id],
      );

      const nextAttemptCount = verificationCode.attempt_count + 1;
      if (nextAttemptCount >= AuthService.MAX_ATTEMPTS) {
        throw new AppHttpException(
          "TOO_MANY_ATTEMPTS",
          "验证码错误次数过多，请重新获取验证码",
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      throw new AppHttpException(
        "INVALID_CODE",
        "验证码错误或已过期",
        HttpStatus.UNAUTHORIZED,
      );
    }

    await this.dataSource.query(
      `
        UPDATE email_verification_codes
        SET consumed_at = NOW()
        WHERE id = $1
      `,
      [verificationCode.id],
    );

    const users = await this.dataSource.query<[UserRow]>(
      `
        INSERT INTO users (email)
        VALUES ($1)
        ON CONFLICT (email)
        DO UPDATE SET updated_at = NOW()
        RETURNING id, email, onboarding_completed
      `,
      [email],
    );

    const user = users[0];
    const sessionToken = randomBytes(32).toString("hex");
    const sessionTokenHash = this.hashSessionToken(sessionToken);
    const expiresAt = new Date(
      Date.now() + AuthService.SESSION_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
    );

    await this.dataSource.query(
      `
        INSERT INTO auth_sessions (user_id, session_token_hash, expires_at, last_used_at, ip_address, user_agent)
        VALUES ($1, $2, $3, NOW(), NULL, NULL)
      `,
      [user.id, sessionTokenHash, expiresAt.toISOString()],
    );

    response.cookie(
      this.configService.getOrThrow<string>("sessionCookieName"),
      sessionToken,
      this.getCookieOptions(expiresAt),
    );

    return {
      user: this.mapUser(user),
    };
  }

  async logout(response: Response): Promise<void> {
    const cookieName = this.configService.getOrThrow<string>("sessionCookieName");
    const sessionToken = this.readCookieValue(response.req?.headers.cookie, cookieName);

    if (sessionToken) {
      await this.dataSource.query(
        `DELETE FROM auth_sessions WHERE session_token_hash = $1`,
        [this.hashSessionToken(sessionToken)],
      );
    }

    response.clearCookie(cookieName, this.getCookieOptions());
  }

  async authenticateRequest(cookieHeader: string | undefined): Promise<RequestUser> {
    const cookieName = this.configService.getOrThrow<string>("sessionCookieName");
    const sessionToken = this.readCookieValue(cookieHeader, cookieName);

    if (!sessionToken) {
      throw new UnauthorizedException("未登录或登录已过期");
    }

    const rows = await this.dataSource.query<SessionRow[]>(
      `
        SELECT
          s.id AS auth_session_id,
          u.id,
          u.email,
          u.onboarding_completed
        FROM auth_sessions s
        INNER JOIN users u ON u.id = s.user_id
        WHERE s.session_token_hash = $1
          AND s.expires_at > NOW()
        LIMIT 1
      `,
      [this.hashSessionToken(sessionToken)],
    );

    const session = rows[0];
    if (!session) {
      throw new UnauthorizedException("未登录或登录已过期");
    }

    await this.dataSource.query(
      `UPDATE auth_sessions SET last_used_at = NOW() WHERE id = $1`,
      [session.auth_session_id],
    );

    return this.mapUser(session);
  }

  private async getLatestVerificationCode(
    email: string,
  ): Promise<VerificationCodeRow | null> {
    const rows = await this.dataSource.query<VerificationCodeRow[]>(
      `
        SELECT id, code_hash, expires_at, attempt_count, last_sent_at
        FROM email_verification_codes
        WHERE email = $1
          AND purpose = $2
          AND consumed_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [email, AuthService.LOGIN_PURPOSE],
    );

    return rows[0] ?? null;
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private generateVerificationCode(): string {
    return String(randomInt(100000, 1000000));
  }

  private hashVerificationCode(email: string, code: string): string {
    return createHash("sha256")
      .update(`${this.configService.getOrThrow<string>("sessionSecret")}:${email}:${code}`)
      .digest("hex");
  }

  private hashSessionToken(token: string): string {
    return createHash("sha256")
      .update(`${this.configService.getOrThrow<string>("sessionSecret")}:${token}`)
      .digest("hex");
  }

  private areHashesEqual(expectedHash: string, actualHash: string): boolean {
    return timingSafeEqual(
      Buffer.from(expectedHash, "hex"),
      Buffer.from(actualHash, "hex"),
    );
  }

  private isExpired(isoTimestamp: string): boolean {
    return new Date(isoTimestamp).getTime() <= Date.now();
  }

  private getCookieOptions(expiresAt?: Date): CookieOptions {
    return {
      httpOnly: true,
      sameSite: "lax",
      secure: this.configService.getOrThrow<string>("nodeEnv") === "production",
      path: "/",
      expires: expiresAt,
      maxAge: expiresAt ? expiresAt.getTime() - Date.now() : 0,
    };
  }

  private readCookieValue(cookieHeader: string | undefined, cookieName: string): string | null {
    if (!cookieHeader) {
      return null;
    }

    const parts = cookieHeader.split(";");
    for (const part of parts) {
      const [rawName, ...rawValue] = part.trim().split("=");
      if (rawName === cookieName) {
        return decodeURIComponent(rawValue.join("="));
      }
    }

    return null;
  }

  private mapUser(user: UserRow): RequestUser {
    return {
      id: user.id,
      email: user.email,
      onboardingCompleted: user.onboarding_completed,
    };
  }
}
