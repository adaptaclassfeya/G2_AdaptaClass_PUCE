import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Teacher analytics ("DATOS" section). Every metric is scoped to the
 * students enrolled in the requesting teacher's paralelos. An optional
 * `paraleloId` narrows the scope to a single classroom (ownership enforced).
 *
 * All aggregation runs in JS over a couple of narrow `findMany` selects.
 * At classroom scale (tens of students, hundreds–low-thousands of attempts)
 * this is well within budget and keeps the query layer type-safe; if a
 * deployment ever outgrows it, the same shape can move to `$queryRaw`
 * GROUP BYs without touching the controller or the frontend contract.
 */
@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getTeacherMetrics(teacherId: string, paraleloId?: string) {
    // 1. Resolve the paralelos this teacher owns (the scope ceiling).
    const paralelos = await this.prisma.paralelo.findMany({
      where: { teacher_id: teacherId },
      select: { id: true, nombre: true, grado: true },
      orderBy: { created_at: 'desc' },
    });
    const ownedIds = new Set(paralelos.map((p) => p.id));

    let scopedParaleloIds: string[];
    if (paraleloId) {
      // A teacher can only inspect their own classrooms.
      if (!ownedIds.has(paraleloId)) {
        throw new ForbiddenException('Este paralelo no te pertenece');
      }
      scopedParaleloIds = [paraleloId];
    } else {
      scopedParaleloIds = paralelos.map((p) => p.id);
    }

    // 2. Students in scope (their meta also feeds the semaphore table).
    const students = await this.prisma.student.findMany({
      where: { paralelo_id: { in: scopedParaleloIds } },
      select: {
        user_id: true,
        nombre: true,
        racha_dias: true,
        puntos_xp: true,
      },
      orderBy: { nombre: 'asc' },
    });
    const studentIds = students.map((s) => s.user_id);

    // No students yet → hand back the empty shape so the UI renders its
    // empty states instead of erroring.
    if (studentIds.length === 0) {
      return {
        scope: {
          paralelos,
          paraleloId: paraleloId ?? null,
          studentCount: 0,
        },
        totals: {
          students: 0,
          attempts: 0,
          correct: 0,
          accuracy: 0,
          sessions: 0,
          minutes: 0,
        },
        porTema: [],
        evolucion: [],
        minijuegos: [],
        estudiantes: [],
      };
    }

    // 3. One pass over attempts powers tema (A), evolución (B) and the
    //    per-student table (D). Only the fields we aggregate are selected.
    const attempts = await this.prisma.questionAttempt.findMany({
      where: { student_id: { in: studentIds } },
      select: {
        student_id: true,
        correcta: true,
        answered_at: true,
        question: { select: { tema: true } },
      },
    });

    // 4. Sessions power the favorite-games donut (C) + the time totals.
    const sessions = await this.prisma.gameSession.findMany({
      where: { student_id: { in: studentIds } },
      select: {
        minutos_jugados: true,
        game: { select: { titulo: true } },
      },
    });

    // ── A. Desempeño por tema ──────────────────────────────────────────
    const temaMap = new Map<string, { total: number; correct: number }>();
    for (const a of attempts) {
      const tema = a.question?.tema || 'General';
      const row = temaMap.get(tema) ?? { total: 0, correct: 0 };
      row.total += 1;
      if (a.correcta) row.correct += 1;
      temaMap.set(tema, row);
    }
    const porTema = [...temaMap.entries()]
      .map(([tema, v]) => ({
        tema,
        total: v.total,
        correctas: v.correct,
        accuracy: pct(v.correct, v.total),
      }))
      // Weakest topic first — that's what the teacher needs to reinforce.
      .sort((a, b) => a.accuracy - b.accuracy);

    // ── B. Evolución de la clase (por día, fechas en UTC) ──────────────
    // Calendar buckets use the UTC date string per the project's TZ rule
    // (Ecuador is UTC-5; local-midnight bucketing would smear days).
    const dayMap = new Map<string, { total: number; correct: number }>();
    for (const a of attempts) {
      const day = a.answered_at.toISOString().slice(0, 10);
      const row = dayMap.get(day) ?? { total: 0, correct: 0 };
      row.total += 1;
      if (a.correcta) row.correct += 1;
      dayMap.set(day, row);
    }
    const evolucion = [...dayMap.entries()]
      .map(([fecha, v]) => ({
        fecha,
        total: v.total,
        correctas: v.correct,
        accuracy: pct(v.correct, v.total),
      }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .slice(-30); // last 30 active days keeps the line readable

    // ── C. Minijuegos favoritos ────────────────────────────────────────
    const gameMap = new Map<string, { sesiones: number; minutos: number }>();
    let totalMinutes = 0;
    for (const s of sessions) {
      const titulo = s.game?.titulo || 'Desconocido';
      // minutos_jugados is Prisma Decimal — coerce to a real number before
      // it ever leaves the backend (Decimal serializes as an odd object).
      const min = Number(s.minutos_jugados) || 0;
      totalMinutes += min;
      const row = gameMap.get(titulo) ?? { sesiones: 0, minutos: 0 };
      row.sesiones += 1;
      row.minutos += min;
      gameMap.set(titulo, row);
    }
    const minijuegos = [...gameMap.entries()]
      .map(([titulo, v]) => ({
        titulo,
        sesiones: v.sesiones,
        minutos: round1(v.minutos),
      }))
      .sort((a, b) => b.sesiones - a.sesiones);

    // ── D. Semáforo de estudiantes ─────────────────────────────────────
    const perStudent = new Map<string, { total: number; correct: number }>();
    for (const a of attempts) {
      const row = perStudent.get(a.student_id) ?? { total: 0, correct: 0 };
      row.total += 1;
      if (a.correcta) row.correct += 1;
      perStudent.set(a.student_id, row);
    }
    const estudiantes = students
      .map((s) => {
        const row = perStudent.get(s.user_id) ?? { total: 0, correct: 0 };
        return {
          user_id: s.user_id,
          nombre: s.nombre,
          racha_dias: s.racha_dias,
          puntos_xp: s.puntos_xp,
          intentos: row.total,
          correctas: row.correct,
          accuracy: pct(row.correct, row.total),
        };
      })
      // Highest XP first, then most attempts — surfaces the most active.
      .sort((a, b) => b.puntos_xp - a.puntos_xp || b.intentos - a.intentos);

    const totalCorrect = attempts.reduce(
      (acc, a) => acc + (a.correcta ? 1 : 0),
      0,
    );

    return {
      scope: {
        paralelos,
        paraleloId: paraleloId ?? null,
        studentCount: students.length,
      },
      totals: {
        students: students.length,
        attempts: attempts.length,
        correct: totalCorrect,
        accuracy: pct(totalCorrect, attempts.length),
        sessions: sessions.length,
        minutes: round1(totalMinutes),
      },
      porTema,
      evolucion,
      minijuegos,
      estudiantes,
    };
  }

  /**
   * Platform-wide metrics for the ADMIN dashboard. No per-teacher scoping —
   * this is the business/health view across every user and session.
   * Aggregation runs in JS over a few narrow selects + two groupBy counts.
   */
  async getAdminMetrics() {
    const [users, sessions, sourceGroups, questionGroups, teachers] =
      await Promise.all([
        // Growth curve + user KPIs.
        this.prisma.user.findMany({
          select: { role: true, created_at: true },
        }),
        // Activity volume + top games + minute totals.
        this.prisma.gameSession.findMany({
          select: {
            started_at: true,
            minutos_jugados: true,
            game: { select: { titulo: true } },
          },
        }),
        // AI adoption: documents uploaded per teacher.
        this.prisma.questionSource.groupBy({
          by: ['teacher_id'],
          _count: { id: true },
        }),
        // AI adoption: questions generated per teacher.
        this.prisma.question.groupBy({
          by: ['teacher_id'],
          _count: { id: true },
        }),
        this.prisma.teacher.findMany({
          select: { user_id: true, nombre: true },
        }),
      ]);

    // ── A. Crecimiento y adopción (cumulative por mes, segmentado) ──────
    // Buckets by UTC month; ADMIN accounts are excluded from the curve.
    const monthMap = new Map<
      string,
      { estudiantes: number; profesores: number }
    >();
    for (const u of users) {
      if (u.role === 'ADMIN') continue;
      const month = u.created_at.toISOString().slice(0, 7); // YYYY-MM
      const row = monthMap.get(month) ?? { estudiantes: 0, profesores: 0 };
      if (u.role === 'STUDENT') row.estudiantes += 1;
      else if (u.role === 'TEACHER') row.profesores += 1;
      monthMap.set(month, row);
    }
    let cumEstudiantes = 0;
    let cumProfesores = 0;
    const crecimiento = [...monthMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([periodo, v]) => {
        cumEstudiantes += v.estudiantes;
        cumProfesores += v.profesores;
        return {
          periodo,
          // Cumulative totals → the area grows over time (adoption).
          estudiantes: cumEstudiantes,
          profesores: cumProfesores,
          // New sign-ups that month (handy for tooltips).
          nuevosEstudiantes: v.estudiantes,
          nuevosProfesores: v.profesores,
        };
      });

    // ── B. Volumen de actividad global (sesiones por mes) ──────────────
    // ── C. Top juegos globales (minutos por juego) ─────────────────────
    const actMap = new Map<string, number>();
    const gameMap = new Map<string, { minutos: number; sesiones: number }>();
    let totalMinutes = 0;
    for (const s of sessions) {
      const month = s.started_at.toISOString().slice(0, 7);
      actMap.set(month, (actMap.get(month) ?? 0) + 1);

      const min = Number(s.minutos_jugados) || 0;
      totalMinutes += min;
      const titulo = s.game?.titulo || 'Desconocido';
      const g = gameMap.get(titulo) ?? { minutos: 0, sesiones: 0 };
      g.minutos += min;
      g.sesiones += 1;
      gameMap.set(titulo, g);
    }
    const actividad = [...actMap.entries()]
      .map(([periodo, sesiones]) => ({ periodo, sesiones }))
      .sort((a, b) => a.periodo.localeCompare(b.periodo));
    const topJuegos = [...gameMap.entries()]
      .map(([titulo, v]) => ({
        titulo,
        minutos: round1(v.minutos),
        sesiones: v.sesiones,
      }))
      .sort((a, b) => b.minutos - a.minutos);

    // ── D. Adopción de la IA por docente ───────────────────────────────
    const sourceCount = new Map<string, number>();
    for (const g of sourceGroups) sourceCount.set(g.teacher_id, g._count.id);
    const questionCount = new Map<string, number>();
    for (const g of questionGroups) questionCount.set(g.teacher_id, g._count.id);
    const iaAdopcion = teachers
      .map((t) => ({
        teacher_id: t.user_id,
        nombre: t.nombre,
        documentos: sourceCount.get(t.user_id) ?? 0,
        preguntas: questionCount.get(t.user_id) ?? 0,
      }))
      // Power users first (most questions, then most documents).
      .sort((a, b) => b.preguntas - a.preguntas || b.documentos - a.documentos);

    const totalStudents = users.filter((u) => u.role === 'STUDENT').length;
    const totalTeachers = users.filter((u) => u.role === 'TEACHER').length;
    const totalQuestions = [...questionCount.values()].reduce(
      (acc, n) => acc + n,
      0,
    );
    const totalSources = [...sourceCount.values()].reduce(
      (acc, n) => acc + n,
      0,
    );

    return {
      totals: {
        students: totalStudents,
        teachers: totalTeachers,
        users: totalStudents + totalTeachers,
        sessions: sessions.length,
        minutes: round1(totalMinutes),
        questions: totalQuestions,
        sources: totalSources,
      },
      crecimiento,
      actividad,
      topJuegos,
      iaAdopcion,
    };
  }
}

// Integer percentage 0–100; 0 when there's no denominator.
function pct(correct: number, total: number): number {
  return total === 0 ? 0 : Math.round((correct / total) * 100);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
