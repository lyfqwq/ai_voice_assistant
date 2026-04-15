import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class PatchLearningProfileDto {
  @IsString()
  @MaxLength(5000)
  goalText!: string;

  @IsString()
  @MaxLength(5000)
  currentLevelText!: string;

  @IsInt()
  @Min(1)
  weeklyTimeMinutes!: number;

  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  userDeclaredWeakPoints!: string[];
}
