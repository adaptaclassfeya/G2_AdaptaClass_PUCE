// Intent handlers — each one is a thin orchestration over an existing
// service. None of them call the LLM. The point of routing here is to
// answer with live DB data and zero tokens.
//
// Handlers return `reply` text + optional `suggestions` (chips to render
// under the response). Suggestions surface natural next-steps so the
// student rarely has to free-type.

import { MissionType } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import type { MissionsService } from '../missions/missions.service';
import type { NotificationsService } from '../notifications/notifications.service';
import type { GamesService } from '../games/games.service';
import type { ParalelosService } from '../paralelos/paralelos.service';
import type { AchievementsService } from '../achievements/achievements.service';
import type { IntentName } from './intent-router';

export interface IntentContext {
  studentId: string;
  studentName: string;
  paraleloId: string | null;
  personaName: string;
  prisma: PrismaService;
  missionsService: MissionsService;
  notificationsService: NotificationsService;
  gamesService: GamesService;
  paralelosService: ParalelosService;
  achievementsService: AchievementsService;
}

export interface IntentResult {
  reply: string;
  suggestions?: string[];
}

const COMMON_SUGGESTIONS = [
  '¿Qué tareas tengo?',
  '¿Cuántos minutos me faltan?',
  '¿Cuánto XP tengo?',
  '¿Cómo voy en el ranking?',
];

function noParaleloReply(personaName: string): IntentResult {
  return {
    reply: `Aún no estás en un paralelo, así que ${personaName} no puede ver tus tareas ni tu progreso. Únete con el código que te dio tu profesor.`,
    suggestions: ['¿Cómo me uno a un paralelo?'],
  };
}

/**
 * Streak XP bonus formula — duplicated from AuthService.login intentionally.
 * Lifting it to a shared util is a bigger refactor than this intent needs.
 * Keep both copies in sync if the curve changes (cap is 50, +5 per week).
 */
function streakBonusFor(racha: number): number {
  return Math.min(10 + 5 * Math.floor(racha / 7), 50);
}

function formatDateShort(d: Date): string {
  // Spanish short form: "12 jun"
  const month = [
    'ene',
    'feb',
    'mar',
    'abr',
    'may',
    'jun',
    'jul',
    'ago',
    'sep',
    'oct',
    'nov',
    'dic',
  ][d.getUTCMonth()];
  return `${d.getUTCDate()} ${month}`;
}

const HANDLERS: Record<
  IntentName,
  (ctx: IntentContext) => Promise<IntentResult>
> = {
  // GREETING/HELP don't touch the DB so they're synchronous in spirit;
  // we wrap with Promise.resolve to satisfy the Record<…, async> contract
  // without the lint complaining about no-await async functions.
  GREETING: ({ studentName, personaName }) =>
    Promise.resolve({
      reply: `¡Hola ${studentName}! Soy ${personaName}. Puedo contarte qué tareas tienes, cómo vas en XP o ayudarte a elegir un juego.`,
      suggestions: COMMON_SUGGESTIONS,
    }),

  HELP: ({ personaName }) =>
    Promise.resolve({
      reply: `Soy ${personaName}. Te puedo decir: qué misiones tienes, cuántos minutos te faltan, tu XP, racha y bono diario, tus logros, cuántas preguntas has acertado, cuándo vence tu próxima misión, qué juegos puedes jugar y cómo vas en el ranking.`,
      suggestions: [
        '¿Qué tareas tengo?',
        '¿Qué logros llevo?',
        '¿Qué juego me recomiendas?',
        '¿Cuándo vence mi próxima misión?',
      ],
    }),

  MISSIONS_PENDING: async (ctx) => {
    if (!ctx.paraleloId) return noParaleloReply(ctx.personaName);
    const { pending } = await ctx.missionsService.getMyMissions(ctx.studentId);
    if (pending.length === 0) {
      return {
        reply: '¡No tienes tareas pendientes! Aprovecha para jugar y subir XP.',
        suggestions: ['¿Qué juegos puedo jugar?', '¿Cuánto XP tengo?'],
      };
    }
    const lines = pending.slice(0, 3).map((m) => {
      const remaining = Math.max(0, m.goal_value - m.current_value);
      const labelByType: Record<MissionType, string> = {
        PLAY_TIME: `jugar ${m.goal_value} min (te faltan ${remaining.toFixed(1)})`,
        PLAY_DISTINCT: `probar ${m.goal_value} juegos distintos (te faltan ${remaining})`,
        ANSWER_CORRECT: `acertar ${m.goal_value} preguntas (te faltan ${remaining})`,
      };
      return `• ${labelByType[m.tipo]} — +${m.xp_reward} XP`;
    });
    const more = pending.length > 3 ? `\n…y ${pending.length - 3} más.` : '';
    return {
      reply: `Tienes ${pending.length} misión(es) pendiente(s):\n${lines.join('\n')}${more}`,
      suggestions: ['¿Cuántos minutos me faltan?', '¿Qué juegos puedo jugar?'],
    };
  },

  MISSIONS_TIME_LEFT: async (ctx) => {
    if (!ctx.paraleloId) return noParaleloReply(ctx.personaName);
    const { pending } = await ctx.missionsService.getMyMissions(ctx.studentId);
    const timeMissions = pending.filter(
      (m) => m.tipo === MissionType.PLAY_TIME,
    );
    if (timeMissions.length === 0) {
      return {
        reply: 'No tienes misiones de tiempo activas en este momento.',
        suggestions: ['¿Qué tareas tengo?', '¿Qué juegos puedo jugar?'],
      };
    }
    const lines = timeMissions.map((m) => {
      const remaining = Math.max(0, m.goal_value - m.current_value);
      return `• ${remaining.toFixed(1)} min para completar la misión de ${m.goal_value} min (+${m.xp_reward} XP)`;
    });
    return {
      reply: `Te falta:\n${lines.join('\n')}`,
      suggestions: ['¿Qué juegos puedo jugar?'],
    };
  },

  MISSIONS_COMPLETED: async (ctx) => {
    if (!ctx.paraleloId) return noParaleloReply(ctx.personaName);
    const { completed } = await ctx.missionsService.getMyMissions(
      ctx.studentId,
    );
    if (completed.length === 0) {
      return {
        reply:
          'Todavía no has completado ninguna misión. ¡Empieza con la primera!',
        suggestions: ['¿Qué tareas tengo?'],
      };
    }
    const totalXp = completed.reduce((acc, m) => acc + (m.xp_ganado ?? 0), 0);
    return {
      reply: `Has completado ${completed.length} misión(es) y ganado ${totalXp} XP por ellas. ¡Bien hecho!`,
      suggestions: ['¿Cuánto XP tengo?', '¿Cómo voy en el ranking?'],
    };
  },

  NEXT_DEADLINE: async (ctx) => {
    if (!ctx.paraleloId) return noParaleloReply(ctx.personaName);
    const { pending } = await ctx.missionsService.getMyMissions(ctx.studentId);
    if (pending.length === 0) {
      return {
        reply: 'No tienes misiones pendientes, así que no hay fecha límite.',
        suggestions: ['¿Qué juegos puedo jugar?'],
      };
    }
    // pending is already sorted by fecha_limite asc upstream
    const next = pending[0];
    const due = new Date(next.fecha_limite);
    const now = new Date();
    const diffMs = due.getTime() - now.getTime();
    const days = Math.ceil(diffMs / 86_400_000);
    const labelByType: Record<MissionType, string> = {
      PLAY_TIME: `jugar ${next.goal_value} min`,
      PLAY_DISTINCT: `probar ${next.goal_value} juegos`,
      ANSWER_CORRECT: `acertar ${next.goal_value} preguntas`,
    };
    const when =
      days <= 0
        ? '¡hoy es el último día!'
        : days === 1
          ? 'mañana'
          : `en ${days} días (${formatDateShort(due)})`;
    return {
      reply: `Tu próxima misión vence ${when}: ${labelByType[next.tipo]} (+${next.xp_reward} XP).`,
      suggestions: ['¿Qué tareas tengo?', '¿Cuántos minutos me faltan?'],
    };
  },

  XP_STATUS: async (ctx) => {
    const student = await ctx.prisma.student.findUnique({
      where: { user_id: ctx.studentId },
      select: { puntos_xp: true, racha_dias: true },
    });
    if (!student) {
      return { reply: 'No pude leer tu perfil de estudiante.' };
    }
    return {
      reply: `Tienes ${student.puntos_xp} XP y una racha de ${student.racha_dias} día(s). ¡Sigue así!`,
      suggestions: ['¿Cómo voy en el ranking?', '¿Qué tareas tengo?'],
    };
  },

  STREAK: async (ctx) => {
    const student = await ctx.prisma.student.findUnique({
      where: { user_id: ctx.studentId },
      select: { racha_dias: true },
    });
    if (!student) return { reply: 'No pude leer tu racha.' };
    if (student.racha_dias === 0) {
      return {
        reply: 'Aún no tienes una racha. Entra mañana para empezar la primera.',
        suggestions: ['¿Cuánto XP tengo?'],
      };
    }
    return {
      reply: `Llevas ${student.racha_dias} día(s) seguido(s) entrando. Cada 7 días el bono de XP sube.`,
      suggestions: ['¿Cuánto bono diario tengo?', '¿Cuánto XP tengo?'],
    };
  },

  LOGIN_BONUS: async (ctx) => {
    const student = await ctx.prisma.student.findUnique({
      where: { user_id: ctx.studentId },
      select: { racha_dias: true, last_login_date: true },
    });
    if (!student) return { reply: 'No pude leer tu bono.' };
    const todayKey = new Date().toISOString().slice(0, 10);
    const lastKey = student.last_login_date?.toISOString().slice(0, 10);
    const bonus = streakBonusFor(student.racha_dias);
    if (lastKey !== todayKey) {
      return {
        reply: `Si entras hoy ganarás un bono de ${bonus} XP por tu racha de ${student.racha_dias} día(s).`,
        suggestions: ['¿Cuánto XP tengo?'],
      };
    }
    return {
      reply: `Hoy ganaste un bono de ${bonus} XP por tu racha de ${student.racha_dias} día(s). El bono crece +5 cada 7 días, hasta 50.`,
      suggestions: ['¿Cuánto XP tengo?', '¿Mi racha?'],
    };
  },

  NOTIFICATIONS_PENDING: async (ctx) => {
    const items = await ctx.notificationsService.getPending(ctx.studentId);
    if (items.length === 0) {
      return {
        reply: 'No tienes notificaciones nuevas.',
        suggestions: ['¿Qué tareas tengo?'],
      };
    }
    const top = items.slice(0, 3).map((n) => `• ${n.mensaje}`);
    const more = items.length > 3 ? `\n…y ${items.length - 3} más.` : '';
    return {
      reply: `Tienes ${items.length} notificación(es) nueva(s):\n${top.join('\n')}${more}`,
      suggestions: ['¿Qué tareas tengo?'],
    };
  },

  GAMES_AVAILABLE: async (ctx) => {
    // Reuses the existing student-bank-resolution logic — the count of
    // questions shown here is the same one the catalog card shows.
    const games = await ctx.gamesService.findAllForUser(
      ctx.studentId,
      'STUDENT',
    );
    if (games.length === 0) {
      return { reply: 'No hay juegos disponibles ahora mismo.' };
    }
    const top = games.slice(0, 4).map((g) => `• ${g.titulo}`);
    const more =
      games.length > 4 ? `\n…y ${games.length - 4} más en el catálogo.` : '';
    return {
      reply: `Hay ${games.length} juegos disponibles para ti:\n${top.join('\n')}${more}`,
      suggestions: ['¿Qué juego me recomiendas?', '¿Qué tareas tengo?'],
    };
  },

  RECOMMEND_GAME: async (ctx) => {
    // Pick the game with the fewest sessions for this student — gentle
    // nudge toward variety. Tie-break by title for determinism.
    const games = await ctx.gamesService.findAllForUser(
      ctx.studentId,
      'STUDENT',
    );
    if (games.length === 0) {
      return { reply: 'No hay juegos disponibles ahora mismo.' };
    }
    const sessions = await ctx.prisma.gameSession.groupBy({
      by: ['game_id'],
      where: { student_id: ctx.studentId },
      _count: { _all: true },
    });
    const countByGame = new Map(
      sessions.map((s) => [s.game_id, s._count._all]),
    );
    const ranked = [...games].sort((a, b) => {
      const ca = countByGame.get(a.id) ?? 0;
      const cb = countByGame.get(b.id) ?? 0;
      if (ca !== cb) return ca - cb;
      return a.titulo.localeCompare(b.titulo);
    });
    const pick = ranked[0];
    const reason =
      (countByGame.get(pick.id) ?? 0) === 0
        ? 'porque todavía no lo has probado'
        : 'porque casi no lo has jugado';
    return {
      reply: `Te recomiendo **${pick.titulo}** ${reason}. ¡Pruébalo y sube XP!`,
      suggestions: ['¿Qué juegos puedo jugar?', '¿Qué tareas tengo?'],
    };
  },

  RANKING: async (ctx) => {
    if (!ctx.paraleloId) return noParaleloReply(ctx.personaName);
    const ranking = await ctx.paralelosService.ranking(
      ctx.paraleloId,
      ctx.studentId,
      'STUDENT',
    );
    const me = ranking.find((r) => r.user_id === ctx.studentId);
    if (!me) {
      return { reply: 'No encontré tu posición en el ranking de tu paralelo.' };
    }
    const total = ranking.length;
    const top = ranking
      .slice(0, 3)
      .map((r) => `${r.rank}. ${r.nombre} — ${r.puntos_xp} XP`)
      .join('\n');
    return {
      reply: `Vas #${me.rank} de ${total} en tu paralelo con ${me.puntos_xp} XP.\nTop 3:\n${top}`,
      suggestions: ['¿Cuánto XP tengo?', '¿Qué tareas tengo?'],
    };
  },

  ACHIEVEMENTS: async (ctx) => {
    const all = await ctx.achievementsService.getMyAchievements(ctx.studentId);
    const earned = all.filter((a) => a.earned);
    if (earned.length === 0) {
      return {
        reply: `Aún no tienes logros desbloqueados. Hay ${all.length} por ganar — juega y completa misiones para conseguirlos.`,
        suggestions: ['¿Qué tareas tengo?', '¿Qué juegos puedo jugar?'],
      };
    }
    const top = earned.slice(0, 3).map((a) => `• ${a.nombre}`);
    const more = earned.length > 3 ? `\n…y ${earned.length - 3} más.` : '';
    return {
      reply: `Has desbloqueado ${earned.length} de ${all.length} logros:\n${top.join('\n')}${more}`,
      suggestions: ['¿Cuánto XP tengo?', '¿Qué tareas tengo?'],
    };
  },

  TOTAL_PLAY_TIME: async (ctx) => {
    const result = await ctx.prisma.gameSession.aggregate({
      where: { student_id: ctx.studentId },
      _sum: { minutos_jugados: true },
      _count: { _all: true },
    });
    const total = Number(result._sum.minutos_jugados ?? 0);
    if (total === 0) {
      return {
        reply: 'Todavía no has jugado nada. ¡Empieza con cualquier juego!',
        suggestions: ['¿Qué juego me recomiendas?'],
      };
    }
    return {
      reply: `Llevas ${total.toFixed(1)} min en total a lo largo de ${result._count._all} sesión(es) de juego.`,
      suggestions: ['¿Qué juego me recomiendas?', '¿Qué tareas tengo?'],
    };
  },

  ANSWERS_STATS: async (ctx) => {
    // Two cheap counts beat one groupBy when the table is small.
    const [intentadas, correctas] = await Promise.all([
      ctx.prisma.questionAttempt.count({
        where: { student_id: ctx.studentId },
      }),
      ctx.prisma.questionAttempt.count({
        where: { student_id: ctx.studentId, correcta: true },
      }),
    ]);
    if (intentadas === 0) {
      return {
        reply:
          'Aún no has respondido preguntas en ningún juego. Cuando juegues uno con quiz, tu precisión aparecerá aquí.',
        suggestions: ['¿Qué juego me recomiendas?'],
      };
    }
    const pct = Math.round((correctas / intentadas) * 100);
    return {
      reply: `Has acertado ${correctas} de ${intentadas} preguntas (${pct}%). ¡Sigue practicando!`,
      suggestions: ['¿Cuánto XP tengo?', '¿Qué tareas tengo?'],
    };
  },

  MY_TEACHER: async (ctx) => {
    if (!ctx.paraleloId) return noParaleloReply(ctx.personaName);
    const paralelo = await ctx.prisma.paralelo.findUnique({
      where: { id: ctx.paraleloId },
      select: {
        teacher: { select: { teacher: { select: { nombre: true } } } },
      },
    });
    const name = paralelo?.teacher?.teacher?.nombre;
    if (!name) {
      return { reply: 'No encontré el nombre de tu profe.' };
    }
    return {
      reply: `Tu profe es ${name}.`,
      suggestions: ['¿En qué paralelo estoy?', '¿Qué tareas tengo?'],
    };
  },

  MY_PARALELO: async (ctx) => {
    if (!ctx.paraleloId) return noParaleloReply(ctx.personaName);
    const paralelo = await ctx.prisma.paralelo.findUnique({
      where: { id: ctx.paraleloId },
      select: { nombre: true, grado: true },
    });
    if (!paralelo) {
      return { reply: 'No encontré la información de tu paralelo.' };
    }
    return {
      reply: `Estás en ${paralelo.nombre} (${paralelo.grado}° EGB).`,
      suggestions: ['¿Quién es mi profe?', '¿Cómo voy en el ranking?'],
    };
  },
};

export async function handleIntent(
  intent: IntentName,
  ctx: IntentContext,
): Promise<IntentResult> {
  // intent is typed as IntentName (a closed union) — not user-controlled input.
  // eslint-disable-next-line security/detect-object-injection
  return HANDLERS[intent](ctx);
}
