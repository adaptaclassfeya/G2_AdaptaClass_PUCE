-- AlterTable
-- Widens StudentMissionProgress.current_value from INT to DECIMAL(7,2) so
-- PLAY_TIME progress preserves the fractional minutes from heartbeats
-- (each heartbeat adds 0.5 min). The cast is safe because every existing
-- integer fits inside DECIMAL(7,2).
ALTER TABLE "student_mission_progress"
  ALTER COLUMN "current_value" SET DATA TYPE DECIMAL(7,2)
  USING "current_value"::DECIMAL(7,2);
