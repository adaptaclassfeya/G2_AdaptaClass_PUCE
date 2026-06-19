import { Injectable, Logger } from '@nestjs/common';
import { MissionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MissionsService } from '../missions/missions.service';
import { GamesService } from '../games/games.service';
import { sanitizeForPrompt } from '../common/security/prompt-sanitize';

/**
 * Builder for the per-message context block we inject into the chatbot's
 * LLM system prompt. Replaces the old "name + grade only" payload with a
 * sanitized snapshot of:
 *   - paralelo (name, grade)
 *   - teacher name
 *   - last 3 study materials uploaded by the teacher
 *   - student accuracy stats
 *   - top 3 pending missions (closest to completion first)
 *   - the game currently on screen (resolved from `currentPath`)
 *
 * Design rules (CLAUDE.md §"Reglas de Seguridad Obligatorias" and the
 * production-hardening review):
 *   1. Sanitize EVERY teacher- or student-provided string with
 *      `sanitizeForPrompt` before letting it into the markdown block.
 *      That blocks filename-based prompt-injection ("ignora.pdf").
 *   2. Parallelize sub-queries via `Promise.all` so the chat round-trip
 *      doesn't grow linearly with the number of context buckets.
 *   3. Wrap each sub-query in its own try/catch. A failing bucket is
 *      rendered as "_(no disponible)_" instead of nuking the whole reply.
 *   4. Cache by studentId+currentPath with a 30s TTL and a hard cap of
 *      500 entries. Chat is bursty (a kid types 4–5 messages in a row);
 *      caching means subsequent messages cost zero DB.
 *   5. Translate `Tema` enum values to Spanish before printing so the
 *      model never sees `LENGUA_CULTURA` verbatim.
 *   6. NEVER leak data about other students. The only paralelo-wide
 *      data we surface are the missions, which are shared by design.
 */



const MISSION_LABEL: Record<MissionType, (goal: number) => string> = {
  PLAY_TIME: (g) => `jugar ${g} minutos`,
  PLAY_DISTINCT: (g) => `probar ${g} juegos distintos`,
  ANSWER_CORRECT: (g) => `acertar ${g} preguntas`,
};

const CACHE_TTL_MS = 30_000;
const CACHE_MAX_ENTRIES = 500;
const MATERIALS_LIMIT = 3;
const MISSIONS_LIMIT = 3;

interface CacheEntry {
  expiresAt: number;
  block: string;
}

export interface ChatContextInput {
  studentId: string;
  paraleloId: string | null;
  currentPath: string | null;
}

@Injectable()
export class ChatContextBuilder {
  private readonly logger = new Logger(ChatContextBuilder.name);

  // Receiver object with no prototype so that even if a malicious key
  // somehow reached us, `__proto__`/`constructor` assignments would not
  // pollute Object.prototype. See CLAUDE.md §"Reglas de Seguridad" #2.
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly missionsService: MissionsService,
    private readonly gamesService: GamesService,
  ) {}

  /**
   * Build the markdown context block. Always returns a string; falls back
   * to an empty string if EVERY sub-query fails. Callers should treat
   * "" as "no extra context to inject" and just send the question alone.
   */
  async build(input: ChatContextInput): Promise<string> {
    const cacheKey = `${input.studentId}|${input.currentPath ?? ''}`;
    const cached = this.readCache(cacheKey);
    if (cached !== null) return cached;

    const [paraleloInfo, materialsInfo, accuracyInfo, missionsInfo, gameInfo] =
      await Promise.all([
        this.loadParalelo(input.paraleloId),
        this.loadMaterials(input.paraleloId),
        this.loadAccuracy(input.studentId),
        this.loadMissions(input.studentId, input.paraleloId),
        this.loadGame(input.currentPath),
      ]);

    const block = this.render({
      paraleloInfo,
      materialsInfo,
      accuracyInfo,
      missionsInfo,
      gameInfo,
    });

    this.writeCache(cacheKey, block);
    return block;
  }

  private readCache(key: string): string | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return entry.block;
  }

  private writeCache(key: string, block: string): void {
    if (this.cache.size >= CACHE_MAX_ENTRIES) {
      // Drop expired entries first; if we're still over budget,
      // drop the oldest insertion (Map preserves insertion order).
      const now = Date.now();
      for (const [k, v] of this.cache) {
        if (v.expiresAt < now) this.cache.delete(k);
        if (this.cache.size < CACHE_MAX_ENTRIES) break;
      }
      while (this.cache.size >= CACHE_MAX_ENTRIES) {
        // Map<string, …>.keys() returns an IterableIterator<string>, but
        // TS resolves `.next().value` as `string | undefined`. Cast keeps
        // the type stable for downstream `.delete`.
        const firstKey = this.cache.keys().next().value as string | undefined;
        if (firstKey === undefined) break;
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      block,
    });
  }

  // ── Sub-loaders ─────────────────────────────────────────────────

  private async loadParalelo(
    paraleloId: string | null,
  ): Promise<{ nombre: string; grado: number; teacherName: string } | null> {
    if (!paraleloId) return null;
    try {
      const paralelo = await this.prisma.paralelo.findUnique({
        where: { id: paraleloId },
        select: {
          nombre: true,
          grado: true,
          teacher: { select: { teacher: { select: { nombre: true } } } },
        },
      });
      if (!paralelo) return null;
      const rawTeacher = paralelo.teacher?.teacher?.nombre ?? '';
      return {
        nombre: sanitizeForPrompt(paralelo.nombre, 60),
        grado: paralelo.grado,
        teacherName: sanitizeForPrompt(rawTeacher, 60),
      };
    } catch (err) {
      this.logger.warn(
        `loadParalelo failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }

  private async loadMaterials(
    paraleloId: string | null,
  ): Promise<{ filename: string; tema: string }[]> {
    if (!paraleloId) return [];
    try {
      const paralelo = await this.prisma.paralelo.findUnique({
        where: { id: paraleloId },
        select: { teacher_id: true },
      });
      if (!paralelo) return [];

      const sources = await this.prisma.questionSource.findMany({
        where: { teacher_id: paralelo.teacher_id },
        select: { filename: true, tema: true },
        orderBy: { created_at: 'desc' },
        take: MATERIALS_LIMIT,
      });
      return sources.map((s) => ({
        filename: sanitizeForPrompt(s.filename, 80),
        tema: s.tema,
      }));
    } catch (err) {
      this.logger.warn(
        `loadMaterials failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return [];
    }
  }

  private async loadAccuracy(
    studentId: string,
  ): Promise<{ correctas: number; intentadas: number } | null> {
    try {
      const [intentadas, correctas] = await Promise.all([
        this.prisma.questionAttempt.count({
          where: { student_id: studentId },
        }),
        this.prisma.questionAttempt.count({
          where: { student_id: studentId, correcta: true },
        }),
      ]);
      return { correctas, intentadas };
    } catch (err) {
      this.logger.warn(
        `loadAccuracy failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }

  private async loadMissions(
    studentId: string,
    paraleloId: string | null,
  ): Promise<
    {
      tipo: MissionType;
      goal_value: number;
      current_value: number;
      xp_reward: number;
      descripcion: string | null;
    }[]
  > {
    if (!paraleloId) return [];
    try {
      const { pending } =
        await this.missionsService.getMyMissionsReadOnly(studentId);
      // Sort by completion ratio descending — the closest to done is
      // the most actionable thing to tell the student about.
      const ranked = [...pending].sort((a, b) => {
        const ra = a.goal_value > 0 ? a.current_value / a.goal_value : 0;
        const rb = b.goal_value > 0 ? b.current_value / b.goal_value : 0;
        return rb - ra;
      });
      return ranked.slice(0, MISSIONS_LIMIT).map((m) => ({
        tipo: m.tipo,
        goal_value: m.goal_value,
        current_value: m.current_value,
        xp_reward: m.xp_reward,
        descripcion: m.descripcion
          ? sanitizeForPrompt(m.descripcion, 120)
          : null,
      }));
    } catch (err) {
      this.logger.warn(
        `loadMissions failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return [];
    }
  }

  private async loadGame(currentPath: string | null): Promise<{
    titulo: string;
    tema: string;
    descripcion: string | null;
  } | null> {
    if (!currentPath) return null;
    try {
      const game = await this.gamesService.resolveGameByPath(currentPath);
      if (!game) return null;
      return {
        titulo: sanitizeForPrompt(game.titulo, 60),
        tema: game.tema,
        descripcion: game.descripcion
          ? sanitizeForPrompt(game.descripcion, 200)
          : null,
      };
    } catch (err) {
      this.logger.warn(
        `loadGame failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }

  // ── Rendering ───────────────────────────────────────────────────

  private render(parts: {
    paraleloInfo: Awaited<ReturnType<ChatContextBuilder['loadParalelo']>>;
    materialsInfo: Awaited<ReturnType<ChatContextBuilder['loadMaterials']>>;
    accuracyInfo: Awaited<ReturnType<ChatContextBuilder['loadAccuracy']>>;
    missionsInfo: Awaited<ReturnType<ChatContextBuilder['loadMissions']>>;
    gameInfo: Awaited<ReturnType<ChatContextBuilder['loadGame']>>;
  }): string {
    const lines: string[] = ['[CONTEXTO DEL AULA Y RENDIMIENTO]'];

    if (parts.paraleloInfo) {
      const { nombre, grado, teacherName } = parts.paraleloInfo;
      lines.push(
        `- Paralelo: ${nombre || 'sin nombre'} (${grado}° EGB)`,
        `- Profesor/a: ${teacherName || 'no disponible'}`,
      );
    } else {
      lines.push('- Paralelo: el estudiante aún no se ha unido a uno');
    }

    if (parts.materialsInfo.length > 0) {
      lines.push('- Materiales subidos recientemente por el docente:');
      for (const m of parts.materialsInfo) {
        const tema = m.tema;
        const name = m.filename || 'archivo';
        lines.push(`  · "${name}" — tema: ${tema}`);
      }
    } else {
      lines.push('- Materiales subidos recientemente por el docente: ninguno');
    }

    if (parts.gameInfo) {
      const { titulo, tema, descripcion } = parts.gameInfo;
      const themed = tema;
      const desc = descripcion ? ` — ${descripcion}` : '';
      lines.push(`- Juego en pantalla: ${titulo} (tema: ${themed})${desc}`);
    } else {
      lines.push(
        '- Juego en pantalla: el estudiante no está dentro de un juego',
      );
    }

    if (parts.accuracyInfo) {
      const { correctas, intentadas } = parts.accuracyInfo;
      if (intentadas === 0) {
        lines.push('- Rendimiento: aún no ha respondido preguntas');
      } else {
        const pct = Math.round((correctas / intentadas) * 100);
        lines.push(
          `- Rendimiento: ${correctas}/${intentadas} respuestas correctas (${pct}% de precisión)`,
        );
      }
    } else {
      lines.push('- Rendimiento: no disponible');
    }

    if (parts.missionsInfo.length > 0) {
      lines.push('- Misiones activas más cercanas a completarse:');
      for (const m of parts.missionsInfo) {
        const label = MISSION_LABEL[m.tipo](m.goal_value);
        const remaining = Math.max(0, m.goal_value - m.current_value);
        const desc = m.descripcion ? ` (${m.descripcion})` : '';
        lines.push(
          `  · ${label}${desc} — progreso ${m.current_value.toFixed(1)}/${m.goal_value}, faltan ${remaining.toFixed(1)}, recompensa +${m.xp_reward} XP`,
        );
      }
    } else {
      lines.push('- Misiones activas: ninguna pendiente');
    }

    return lines.join('\n');
  }
}

