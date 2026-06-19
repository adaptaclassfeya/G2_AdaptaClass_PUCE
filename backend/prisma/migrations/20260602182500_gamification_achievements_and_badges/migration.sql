-- CreateEnum
CREATE TYPE "AchievementCode" AS ENUM ('FIRST_PLAY', 'FIRST_MISSION', 'STREAK_7', 'PERFECT_GAME', 'MARATHON', 'ANSWER_50');

-- CreateTable
CREATE TABLE "achievements" (
    "id" TEXT NOT NULL,
    "codigo" "AchievementCode" NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "xp_reward" INTEGER NOT NULL DEFAULT 50,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_achievements" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "achievement_id" TEXT NOT NULL,
    "earned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "xp_gained" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "student_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "achievements_codigo_key" ON "achievements"("codigo");

-- CreateIndex
CREATE INDEX "student_achievements_student_id_idx" ON "student_achievements"("student_id");

-- CreateIndex
CREATE INDEX "student_achievements_achievement_id_idx" ON "student_achievements"("achievement_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_achievements_student_id_achievement_id_key" ON "student_achievements"("student_id", "achievement_id");

-- AddForeignKey
ALTER TABLE "student_achievements" ADD CONSTRAINT "student_achievements_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_achievements" ADD CONSTRAINT "student_achievements_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "achievements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
