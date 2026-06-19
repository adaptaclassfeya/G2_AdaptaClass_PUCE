import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class GamesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve the teacher_id whose question bank should feed `userId`:
   *  - teachers see their own bank
   *  - students see the bank of the teacher who owns their paralelo
   *  - students without a paralelo see no bank (returns null)
   */
  private async resolveContextFor(
    userId: string,
    role: Role,
  ): Promise<{ teacherId: string | null; paraleloId: string | null }> {
    if (role === Role.TEACHER) return { teacherId: userId, paraleloId: null };

    const student = await this.prisma.student.findUnique({
      where: { user_id: userId },
    });
    if (!student?.paralelo_id) return { teacherId: null, paraleloId: null };

    const paralelo = await this.prisma.paralelo.findUnique({
      where: { id: student.paralelo_id },
    });
    return { teacherId: paralelo?.teacher_id ?? null, paraleloId: student.paralelo_id };
  }

  /**
   * Build the scoped `where` clause for the active bank: questions owned
   * by `teacherId` and either global or matching the student's paralelo.
   * Centralized so `findAllForUser` and `getQuestionsForUser` can't drift.
   */
  private scopedQuestionWhere(teacherId: string, paraleloId: string | null) {
    return {
      teacher_id: teacherId,
      ...(paraleloId
        ? { OR: [{ paralelo_id: paraleloId }, { paralelo_id: null }] }
        : {}),
    };
  }

  /**
   * The "active tema" is the `tema` of the most recently created question
   * in scope. Once the teacher uploads a new topic, the bank fed to
   * minigames flips to that topic and stops mixing in older themes — the
   * student's "banco completado" target resets cleanly.
   *
   * Older questions still live in the teacher's bank (TeacherBankPage)
   * and dashboard aggregates; only the in-game feed is filtered.
   */
  private async resolveActiveTema(
    teacherId: string,
    paraleloId: string | null,
  ): Promise<string | null> {
    const latest = await this.prisma.question.findFirst({
      where: this.scopedQuestionWhere(teacherId, paraleloId),
      orderBy: { created_at: 'desc' },
      select: { tema: true },
    });
    return latest?.tema ?? null;
  }

  /**
   * Lists every game in the catalog. Each row includes `questionsCount`,
   * which is the size of the active topic — same number for every game,
   * because every question now applies to every game.
   */
  async findAllForUser(userId: string, role: Role) {
    const context = await this.resolveContextFor(userId, role);
    const teacherId = context.teacherId;
    const paraleloId = context.paraleloId;

    const games = await this.prisma.game.findMany({ orderBy: { titulo: 'asc' } });

    let questionsCount = 0;
    if (teacherId) {
      const activeTema = await this.resolveActiveTema(teacherId, paraleloId);
      if (activeTema) {
        questionsCount = await this.prisma.question.count({
          where: {
            ...this.scopedQuestionWhere(teacherId, paraleloId),
            tema: activeTema,
          },
        });
      }
    }

    return games.map((game) => ({ ...game, questionsCount }));
  }

  /**
   * Returns the active-topic slice of the teacher's bank for any
   * requested game id, in the legacy `[{ preguntas_json: [...] }]` shape
   * the Phaser scenes already understand. The `tema` of the catalog game
   * is intentionally ignored — what filters is the most recent topic the
   * teacher has uploaded.
   */
  async getQuestionsForUser(gameId: string, userId: string, role: Role) {
    const game = await this.prisma.game.findUnique({ where: { id: gameId } });
    if (!game) {
      throw new NotFoundException('Juego no encontrado');
    }

    const context = await this.resolveContextFor(userId, role);
    const teacherId = context.teacherId;
    const paraleloId = context.paraleloId;

    if (!teacherId) return [{ preguntas_json: [] }];

    const activeTema = await this.resolveActiveTema(teacherId, paraleloId);
    if (!activeTema) return [{ preguntas_json: [] }];

    const dbQuestions = await this.prisma.question.findMany({
      where: {
        ...this.scopedQuestionWhere(teacherId, paraleloId),
        tema: activeTema,
      },
      orderBy: { created_at: 'desc' },
    });

    const preguntas_json = dbQuestions.map((q) => {
      const opciones = Array.isArray(q.opciones)
        ? (q.opciones as string[])
        : [];
      const correctIndex = opciones.indexOf(q.respuesta_correcta);
      return {
        id: q.id,
        texto: q.texto,
        opciones,
        respuestaCorrecta: correctIndex !== -1 ? correctIndex : 0,
      };
    });

    return [{ preguntas_json }];
  }

  /**
   * Look up the catalog row that owns a given browser path. The chatbot
   * uses this so it can answer "¿qué juego estoy jugando?" without the
   * client having to send the game id explicitly.
   *
   * Matching strategy:
   *   1. Normalize the input path (drop query/hash, lowercase).
   *   2. Pull all games; cast each `config_default.rutaJuego` to string.
   *   3. Match by EQUALITY first (`/games/tom` === `/games/tom`).
   *      If none match exactly, fall back to startsWith so trailing
   *      segments like `/games/tom/level-2` still resolve to Tom.
   *
   * Returns null if no game matches — callers should treat that as
   * "student is somewhere other than a game page".
   */
  async resolveGameByPath(path: string): Promise<{
    id: string;
    titulo: string;
    tema: string;
    descripcion: string | null;
  } | null> {
    const normalized = normalizeRoutePath(path);
    if (!normalized) return null;

    const games = await this.prisma.game.findMany({
      select: {
        id: true,
        titulo: true,
        tema: true,
        descripcion: true,
        config_default: true,
      },
    });

    type Candidate = (typeof games)[number] & { route: string };
    const candidates: Candidate[] = games
      .map((g) => {
        const cfg = g.config_default as { rutaJuego?: unknown } | null;
        const route =
          typeof cfg?.rutaJuego === 'string' ? cfg.rutaJuego.toLowerCase() : '';
        return { ...g, route };
      })
      .filter((c) => c.route.length > 0);

    const exact = candidates.find((c) => c.route === normalized);
    const match =
      exact ??
      candidates.find((c) => normalized.startsWith(`${c.route}/`)) ??
      null;

    if (!match) return null;
    return {
      id: match.id,
      titulo: match.titulo,
      tema: match.tema,
      descripcion: match.descripcion,
    };
  }
}

/**
 * Drop query string and hash, lowercase, and collapse trailing slashes.
 * Exported via the service module purely for test access; the resolver
 * inlines the call.
 */
function normalizeRoutePath(raw: string): string {
  if (typeof raw !== 'string') return '';
  const noQuery = raw.split('?')[0].split('#')[0];
  return noQuery.toLowerCase().replace(/\/+$/, '');
}
