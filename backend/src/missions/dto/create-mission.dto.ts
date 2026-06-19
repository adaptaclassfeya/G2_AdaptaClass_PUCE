import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MissionType } from '@prisma/client';

export class CreateMissionDto {
  @IsUUID()
  paralelo_id: string;

  @IsEnum(MissionType)
  tipo: MissionType;

  @IsInt()
  @Min(1)
  goal_value: number;

  @IsString()
  fecha_limite: string;

  /**
   * Optional free-text description shown to students on the mission card.
   * Capped at 500 chars so it can't be abused as long-form storage.
   */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;

  /**
   * XP awarded on completion. Capped at 1000 so a single mission can't
   * dwarf the rest of the gamification economy. Falls back to the schema
   * default (100) when omitted.
   */
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(1000)
  xp_reward?: number;
}
