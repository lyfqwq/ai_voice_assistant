import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class GetConversationsQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
