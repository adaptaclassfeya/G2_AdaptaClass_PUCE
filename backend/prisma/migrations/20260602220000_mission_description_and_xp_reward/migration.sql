-- AlterTable
-- Adds an optional free-text description and a configurable XP reward to
-- every mission. xp_reward defaults to 100 so already-created missions
-- keep paying out the same amount they did before.
ALTER TABLE "missions"
  ADD COLUMN "descripcion" TEXT,
  ADD COLUMN "xp_reward" INTEGER NOT NULL DEFAULT 100;
