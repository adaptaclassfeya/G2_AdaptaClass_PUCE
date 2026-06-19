import {
  IsInt,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateParaleloDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  nombre: string;

  @IsInt()
  @Min(3)
  @Max(10)
  grado: number;
}

export class JoinParaleloDto {
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  @Matches(/^[A-Z2-9]+$/, {
    message:
      'codigo_acceso must be 6 uppercase alphanumeric chars (no O, 0, I, 1).',
  })
  codigo_acceso: string;
}
