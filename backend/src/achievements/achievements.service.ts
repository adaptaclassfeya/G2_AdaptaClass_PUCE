import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// Minimum answered questions in a single session for the "perfect game"
// achievement to count — keeps a 1/1 fluke from unlocking it.
const PERFECT_GAME_MIN_QUESTIONS = 3;
const MARATHON_MIN_MINUTES = 20;
const ANSWER_50_GOAL = 50;
const STREAK_7_GOAL = 7;

@Injectable()
export class AchievementsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Idempotent achievement evaluator. Reads the student's stats from the DB
   * (no context needed from the caller), unlocks any newly-earned achievement
   * exactly once, and grants its XP reward. Safe to call from anywhere a
   * student's progress changes (mission recalculation, /achievements/my).
   */
  async evaluateFor(studentId: string): Promise<void> {
    const student = await this.prisma.student.findUnique({
      where: { user_id: studentId },
    });
    if (!student) return;

    const catalog = await this.prisma.achievement.findMany();
    if (catalog.length === 0) return;

    const earned = await this.prisma.studentAchievement.findMany({
      where: { student_id: studentId },
      select: { achievement: { select: { codigo: true } } },
    });
    const earnedCodes = new Set(earned.map((e) => e.achievement.codigo));

    const pending = catalog.filter((a) => !earnedCodes.has(a.codigo));
    if (pending.length === 0) return;

    for (const achievement of pending) {
      const unlocked = await this.isConditionMet(achievement.codigo, student);
      if (!unlocked) continue;

      try {
        await this.prisma.studentAchievement.create({
          data: {
            student_id: studentId,
            achievement_id: achievement.id,
            xp_gained: achievement.xp_reward,
          },
        });
        await this.prisma.student.update({
          where: { user_id: studentId },
          data: { puntos_xp: { increment: achievement.xp_reward } },
        });
      } catch (err) {
        // Unique constraint (P2002) → another concurrent call already
        // unlocked it. Ignore so we never double-grant XP.
        if (
          !(
            err instanceof Prisma.PrismaClientKnownRequestError &&
            err.code === 'P2002'
          )
        ) {
          throw err;
        }
      }
    }
  }

  /**
   * Returns the full catalog annotated with whether the student has earned
   * each one. Runs evaluation first so the data is fresh on every fetch
   * (mirrors how getMyMissions recalculates before returning).
   */
  async getMyAchievements(studentId: string) {
    await this.evaluateFor(studentId);

    const catalog = await this.prisma.achievement.findMany({
      orderBy: { created_at: 'asc' },
    });
    const earned = await this.prisma.studentAchievement.findMany({
      where: { student_id: studentId },
    });
    const earnedByAchievementId = new Map(
      earned.map((e) => [e.achievement_id, e]),
    );

    return catalog.map((a) => {
      const row = earnedByAchievementId.get(a.id);
      return {
        codigo: a.codigo,
        nombre: a.nombre,
        descripcion: a.descripcion,
        icon: a.icon,
        xp_reward: a.xp_reward,
        earned: Boolean(row),
        earned_at: row?.earned_at.toISOString() ?? null,
      };
    });
  }

  private async isConditionMet(
    codigo: string,
    student: { user_id: string; racha_dias: number },
  ): Promise<boolean> {
    const studentId = student.user_id;

    switch (codigo) {
      case 'FIRST_PLAY':
        return (
          (await this.prisma.gameSession.count({
            where: { student_id: studentId },
          })) > 0
        );

      case 'FIRST_MISSION':
        return (
          (await this.prisma.studentMissionProgress.count({
            where: { student_id: studentId, completado: true },
          })) > 0
        );

      case 'STREAK_7':
        return student.racha_dias >= STREAK_7_GOAL;

      case 'PERFECT_GAME': {
        // Prisma can't compare two columns directly, so fetch candidate
        // sessions (enough questions answered) and check equality in JS.
        const sessions = await this.prisma.gameSession.findMany({
          where: {
            student_id: studentId,
            preguntas_intentadas: { gte: PERFECT_GAME_MIN_QUESTIONS },
          },
          select: { preguntas_correctas: true, preguntas_intentadas: true },
        });
        return sessions.some(
          (s) => s.preguntas_correctas === s.preguntas_intentadas,
        );
      }

      case 'MARATHON':
        return (
          (await this.prisma.gameSession.count({
            where: {
              student_id: studentId,
              minutos_jugados: { gte: MARATHON_MIN_MINUTES },
            },
          })) > 0
        );

      case 'ANSWER_50':
        return (
          (await this.prisma.questionAttempt.count({
            where: { student_id: studentId, correcta: true },
          })) >= ANSWER_50_GOAL
        );

      default:
        return false;
    }
  }
}
