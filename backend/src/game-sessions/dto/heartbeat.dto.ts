import { IsNumber, Min } from 'class-validator';

export class HeartbeatDto {
  @IsNumber()
  @Min(0.01)
  played_minutes: number;
}
