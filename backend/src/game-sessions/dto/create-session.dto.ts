import { IsUUID } from 'class-validator';

export class CreateSessionDto {
  @IsUUID()
  game_id: string;
}
