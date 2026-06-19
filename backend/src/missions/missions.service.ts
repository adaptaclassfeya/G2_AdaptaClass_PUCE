import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MissionType } from '@prisma/client';
import { CreateMissionDto } from './dto/create-mission.dto';
import { AchievementsService } from '../achievements/achievements.service';

@Injectable()
export class MissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly achievementsService: AchievementsService,
  ) {}

  async create(dto: CreateMissionDto, teacherId: string) {
    const paralelo = await this.prisma.paralelo.findUnique({
      where: { id: dto.paralelo_id },
    });

    if (!paralelo || paralelo.teacher_id !== teacherId) {
      throw new NotFoundException('Paralelo no encontrado o no autorizado');
    }

    const mission = await this.prisma.mission.create({
      data: {
        paralelo_id: dto.paralelo_id,
        tipo: dto.tipo,
        goal_value: dto.goal_value,
        fecha_limite: new Date(dto.fecha_limite),
        created_by: teacherId,
        descripcion: dto.descripcion ?? null,
        // The schema default is 100 — only override when the teacher
        // explicitly picked a different reward.
        ...(dto.xp_reward !== undefined && { xp_reward: dto.xp_reward }),
      },
    });

    const students = await this.prisma.student.findMany({
      where: { paralelo_id: dto.paralelo_id },
    });

    if (students.length > 0) {
      await this.prisma.studentMissionProgress.createMany({
        data: students.map((student) => ({
          student_id: student.user_id,
          mission_id: mission.id,
          current_value: 0,
          completado: false,
          xp_otorgado: false,
        })),
      });

      const messageTypeMap = {
        PLAY_TIME: `${dto.goal_value} minutos de juego`,
        PLAY_DISTINCT: `${dto.goal_value} juegos distintos`,
        ANSWER_CORRECT: `${dto.goal_value} respuestas correctas`,
      };

      await this.prisma.notification.createMany({
        data: students.map((student) => ({
          student_id: student.user_id,
          mission_id: mission.id,
          mensaje: `¡Nueva misión asignada! Objetivo: ${messageTypeMap[dto.tipo] || dto.goal_value}.`,
        })),
      });
    }

    return mission;
  }

  async getMyMissions(studentUserId: string) {
    return this.getMissionsInternal(studentUserId, true);
  }

  /**
   * Read-only variant used by the chatbot to inject mission context into
   * the LLM prompt. Crucially, it does NOT call recalculateMissionsFor —
   * recalc is a heavy write path (aggregates + DB writes + achievement
   * re-evaluation) and we don't want every chat message to trigger one.
   *
   * The trade-off: the chatbot may show progress that's up to one
   * heartbeat (~30s) stale, which is acceptable for a conversational
   * answer. Game heartbeats and attempts still trigger recalc directly.
   */
  async getMyMissionsReadOnly(studentUserId: string) {
    return this.getMissionsInternal(studentUserId, false);
  }

  private async getMissionsInternal(studentUserId: string, recalc: boolean) {
    const student = await this.prisma.student.findUnique({
      where: { user_id: studentUserId },
    });

    if (!student || !student.paralelo_id) {
      return { pending: [], completed: [] };
    }

    if (recalc) {
      // Ejecuta el recálculo al listar para tener el valor actualizado
      await this.recalculateMissionsFor(studentUserId);
    }

    const missions = await this.prisma.mission.findMany({
      where: { paralelo_id: student.paralelo_id },
      include: {
        progress: {
          where: { student_id: studentUserId },
        },
      },
      orderBy: { fecha_limite: 'asc' },
    });

    const pending = [];
    const completed = [];

    for (const m of missions) {
      const prog = m.progress[0];
      const isCompleted = prog?.completado ?? false;
      const item = {
        id: m.id,
        tipo: m.tipo,
        goal_value: m.goal_value,
        descripcion: m.descripcion,
        xp_reward: m.xp_reward,
        // Prisma's Decimal column serializes as an object; coerce to plain
        // number so the frontend gets a JSON number.
        current_value: Number(prog?.current_value ?? 0),
        completado: isCompleted,
        fecha_limite: m.fecha_limite.toISOString(),
        // Reflect what was actually awarded. Reading it off the mission
        // (rather than hardcoding 100) keeps the UI honest for low/high
        // reward missions.
        xp_ganado: prog?.xp_otorgado ? m.xp_reward : 0,
        completed_at: prog?.completed_at?.toISOString() ?? null,
      };

      if (isCompleted) {
        completed.push(item);
      } else {
        pending.push(item);
      }
    }

    return { pending, completed };
  }

  async listForTeacher(teacherId: string, paraleloId?: string) {
    const missions = await this.prisma.mission.findMany({
      where: {
        created_by: teacherId,
        ...(paraleloId ? { paralelo_id: paraleloId } : {}),
      },
      include: {
        paralelo: { select: { id: true, nombre: true, grado: true } },
        progress: { select: { completado: true } },
      },
      orderBy: { fecha_limite: 'asc' },
    });

    const studentCounts = new Map<string, number>();
    if (missions.length > 0) {
      const paraleloIds = Array.from(
        new Set(missions.map((m) => m.paralelo_id)),
      );
      const counts = await this.prisma.student.groupBy({
        by: ['paralelo_id'],
        where: { paralelo_id: { in: paraleloIds } },
        _count: { user_id: true },
      });
      for (const row of counts) {
        if (row.paralelo_id)
          studentCounts.set(row.paralelo_id, row._count.user_id);
      }
    }

    return missions.map((m) => {
      const completedCount = m.progress.filter((p) => p.completado).length;
      const totalStudents = studentCounts.get(m.paralelo_id) ?? 0;
      return {
        id: m.id,
        paralelo: m.paralelo,
        tipo: m.tipo,
        goal_value: m.goal_value,
        descripcion: m.descripcion,
        xp_reward: m.xp_reward,
        fecha_limite: m.fecha_limite.toISOString(),
        created_at: m.created_at.toISOString(),
        completed_count: completedCount,
        total_students: totalStudents,
      };
    });
  }

  async getProgressDetail(missionId: string, teacherId: string) {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        paralelo: { select: { teacher_id: true } },
      },
    });
    if (!mission) throw new NotFoundException('Misión no encontrada');
    if (
      mission.created_by !== teacherId &&
      mission.paralelo.teacher_id !== teacherId
    ) {
      throw new ForbiddenException('No puedes consultar esta misión');
    }

    const students = await this.prisma.student.findMany({
      where: { paralelo_id: mission.paralelo_id },
      include: { user: { select: { email: true } } },
      orderBy: { nombre: 'asc' },
    });

    const progressRows = await this.prisma.studentMissionProgress.findMany({
      where: { mission_id: missionId },
    });
    const progressByStudent = new Map(
      progressRows.map((p) => [p.student_id, p]),
    );

    return {
      mission_id: missionId,
      tipo: mission.tipo,
      goal_value: mission.goal_value,
      fecha_limite: mission.fecha_limite.toISOString(),
      students: students.map((s) => {
        const p = progressByStudent.get(s.user_id);
        return {
          user_id: s.user_id,
          nombre: s.nombre,
          email: s.user.email,
          current_value: Number(p?.current_value ?? 0),
          completado: p?.completado ?? false,
          completed_at: p?.completed_at?.toISOString() ?? null,
          xp_otorgado: p?.xp_otorgado ?? false,
        };
      }),
    };
  }

  async remove(missionId: string, teacherId: string) {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: { paralelo: { select: { teacher_id: true } } },
    });
    if (!mission) throw new NotFoundException('Misión no encontrada');
    if (
      mission.created_by !== teacherId &&
      mission.paralelo.teacher_id !== teacherId
    ) {
      throw new ForbiddenException('No puedes eliminar esta misión');
    }
    await this.prisma.mission.delete({ where: { id: missionId } });
    return { ok: true };
  }

  async recalculateMissionsFor(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { user_id: studentId },
    });
    if (!student || !student.paralelo_id) return;

    const now = new Date();
    const missions = await this.prisma.mission.findMany({
      where: {
        paralelo_id: student.paralelo_id,
        fecha_limite: { gt: now },
      },
    });

    for (const mission of missions) {
      let progress = await this.prisma.studentMissionProgress.findUnique({
        where: {
          student_id_mission_id: {
            student_id: studentId,
            mission_id: mission.id,
          },
        },
      });

      if (!progress) {
        progress = await this.prisma.studentMissionProgress.create({
          data: {
            student_id: studentId,
            mission_id: mission.id,
            current_value: 0,
            completado: false,
            xp_otorgado: false,
          },
        });
      }

      if (progress.completado && progress.xp_otorgado) continue;

      let currentValue = 0;

      if (mission.tipo === MissionType.PLAY_TIME) {
        const result = await this.prisma.gameSession.aggregate({
          where: {
            student_id: studentId,
            started_at: { gte: mission.created_at },
          },
          _sum: {
            minutos_jugados: true,
          },
        });
        // Keep the fractional minutes from heartbeats (0.5 per beat) so
        // a student who plays 7.5 min toward a 10-min goal sees 7.5, not 7.
        currentValue = Number(result._sum.minutos_jugados ?? 0);
      } else if (mission.tipo === MissionType.PLAY_DISTINCT) {
        const sessions = await this.prisma.gameSession.findMany({
          where: {
            student_id: studentId,
            started_at: { gte: mission.created_at },
          },
          select: { game_id: true },
        });
        currentValue = new Set(sessions.map((s) => s.game_id)).size;
      } else if (mission.tipo === MissionType.ANSWER_CORRECT) {
        currentValue = await this.prisma.questionAttempt.count({
          where: {
            student_id: studentId,
            correcta: true,
            answered_at: { gte: mission.created_at },
          },
        });
      }

      const isCompleted = currentValue >= mission.goal_value;
      const shouldGrantXp = isCompleted && !progress.xp_otorgado;

      await this.prisma.studentMissionProgress.update({
        where: { id: progress.id },
        data: {
          current_value: currentValue,
          ...(isCompleted && {
            completado: true,
            completed_at: progress.completed_at || new Date(),
          }),
          ...(shouldGrantXp && {
            xp_otorgado: true,
          }),
        },
      });

      if (shouldGrantXp) {
        // Use the mission's configured reward (defaults to 100 in the
        // schema for back-compat) so a tougher mission can actually pay
        // out more than a 15-minute warm-up.
        const reward = mission.xp_reward;
        await this.prisma.student.update({
          where: { user_id: studentId },
          data: {
            puntos_xp: { increment: reward },
          },
        });

        // Confirm the completion to the student via the notifications bell.
        // Fires exactly once per mission (gated by the same xp_otorgado flag).
        const goalLabelMap: Record<MissionType, string> = {
          [MissionType.PLAY_TIME]: `${mission.goal_value} minutos de juego`,
          [MissionType.PLAY_DISTINCT]: `${mission.goal_value} juegos distintos`,
          [MissionType.ANSWER_CORRECT]: `${mission.goal_value} respuestas correctas`,
        };
        await this.prisma.notification.create({
          data: {
            student_id: studentId,
            mission_id: mission.id,
            mensaje: `¡Misión completada! Ganaste ${reward} XP por lograr ${goalLabelMap[mission.tipo]}.`,
          },
        });
      }
    }

    // Mission progress is now up to date — re-evaluate achievements that may
    // have just unlocked from this gameplay (first mission, perfect game,
    // marathon, etc.). Idempotent and safe to call on every recalculation.
    await this.achievementsService.evaluateFor(studentId);
  }
}
