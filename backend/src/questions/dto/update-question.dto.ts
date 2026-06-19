import { IsOptional, IsString, IsArray, MaxLength } from 'class-validator';

export class UpdateQuestionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  texto?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  opciones?: string[];

  @IsOptional()
  @IsString()
  respuesta_correcta?: string;
}
