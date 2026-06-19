import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

// Cap user-controlled strings everywhere so we never hand unbounded input
// to bcrypt, the LLM prompt builder, or the DB layer.
const MAX_PASSWORD_LEN = 72; // bcrypt hard limit
const MAX_EMAIL_LEN = 254; // RFC 5321
const MAX_NAME_LEN = 80;

export class RegisterDto {
  @IsString({ message: 'El nombre es requerido' })
  @IsNotEmpty({ message: 'El nombre no puede estar vacío' })
  @MaxLength(MAX_NAME_LEN, { message: `El nombre no puede superar ${MAX_NAME_LEN} caracteres` })
  nombre: string;

  @IsEmail({}, { message: 'Ingresa un correo electrónico válido' })
  @MaxLength(MAX_EMAIL_LEN, { message: 'El correo es demasiado largo' })
  email: string;

  @IsString({ message: 'La contraseña es requerida' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(MAX_PASSWORD_LEN, { message: 'La contraseña es demasiado larga' })
  password: string;

  @IsBoolean({ message: 'El tipo de cuenta no es válido' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  isDocente?: boolean;
}

export class LoginDto {
  @IsEmail({}, { message: 'Ingresa un correo electrónico válido' })
  @MaxLength(MAX_EMAIL_LEN, { message: 'El correo es demasiado largo' })
  email: string;

  @IsString({ message: 'La contraseña es requerida' })
  @IsNotEmpty({ message: 'La contraseña no puede estar vacía' })
  @MaxLength(MAX_PASSWORD_LEN, { message: 'La contraseña es demasiado larga' })
  password: string;
}
