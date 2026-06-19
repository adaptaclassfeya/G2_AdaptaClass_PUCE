import { IsBoolean, IsUUID } from 'class-validator';

export class AttemptDto {
  @IsUUID()
  question_id: string;

  @IsBoolean()
  correcta: boolean;
}
