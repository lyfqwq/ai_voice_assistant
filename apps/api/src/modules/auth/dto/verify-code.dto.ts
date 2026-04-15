import { IsEmail, Matches, MaxLength } from "class-validator";

export class VerifyCodeDto {
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @Matches(/^\d{6}$/)
  code!: string;
}
