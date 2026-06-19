import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateChatbotConfigDto {
  @IsOptional()
  @IsBoolean()
  chatbot_enabled?: boolean;

  // Opt-in LLM fallback. Default in the schema is false so a new paralelo
  // never silently spends API credits — the teacher must flip this on.
  @IsOptional()
  @IsBoolean()
  chatbot_llm_enabled?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  chatbot_persona_name?: string;

  // Up to 5 extra quick-reply chips. Each chip capped at 80 chars so the
  // FAB panel stays readable on mobile.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  @Type(() => String)
  chatbot_extra_suggestions?: string[];
}
