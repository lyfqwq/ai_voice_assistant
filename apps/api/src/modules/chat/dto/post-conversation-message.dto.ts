import { IsString, MaxLength } from "class-validator";

export class PostConversationMessageDto {
  @IsString()
  @MaxLength(10000)
  content!: string;
}
