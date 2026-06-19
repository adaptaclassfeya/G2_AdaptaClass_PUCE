import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

// Allowed characters regex, using * instead of + to support empty string if sent
const SAFE_TEXT = /^[\w\sáéíóúÁÉÍÓÚñÑüÜ.,;:¿?¡!()\-'"\n\r]*$/;

export class GenerateQuestionsDto {
  // `tema` used to gate which games each question fed; the bank is now
  // global per teacher so the value is mostly a legacy classification
  // tag. Kept optional so old UIs still work; the service defaults to
  // LECTURA when missing.
  @IsOptional()
  @IsString()
  tema?: string;

  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(30)
  amount: number;

  @IsString()
  @Matches(/^(Basico|Intermedio|Avanzado)$/, {
    message: 'difficulty must be Basico, Intermedio, or Avanzado.',
  })
  difficulty: string;

  @IsOptional()
  @Transform(({ value }) =>
    value === '' || value === null || value === undefined ? undefined : value,
  )
  @IsString()
  @MaxLength(500)
  @Matches(SAFE_TEXT, {
    message: 'context contains unsupported characters.',
  })
  context?: string;

  @IsOptional()
  @IsUUID()
  source_id?: string;

  @IsOptional()
  @IsUUID()
  paralelo_id?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  force?: boolean;
}

export class SaveQuestionsItemDto {
  @IsString()
  @MaxLength(500)
  texto: string;

  @IsString({ each: true })
  opciones: string[];

  @IsString()
  respuesta_correcta: string;
}

export class SaveQuestionsDto {
  // Same story as in GenerateQuestionsDto: `tema` is now a legacy tag,
  // the bank is global per teacher.
  @IsOptional()
  @IsString()
  tema?: string;

  @IsOptional()
  @IsUUID()
  source_id?: string;

  @IsOptional()
  @IsUUID()
  paralelo_id?: string;

  @ValidateNested({ each: true })
  @Type(() => SaveQuestionsItemDto)
  questions: SaveQuestionsItemDto[];
}
