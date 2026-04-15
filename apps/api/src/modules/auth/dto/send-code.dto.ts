import { IsEmail, MaxLength } from "class-validator";

export class SendCodeDto {
  @IsEmail()
  @MaxLength(320)
  email!: string;
}
