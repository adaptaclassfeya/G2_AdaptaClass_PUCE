import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface PlayerState {
  name: string;
  score: number;
}

export interface AdaptaGPlayerState {
  name: string;
  score: number;
  money: number;
  streak: number;
  currentQuestionIndex: number; // For asynchronous 'Dinero' mode
  gameSessionId: string; // To link QuestionAttempt
}

export interface AdaptaGRoomState {
  pin: string;
  teacherId: string;
  mode: 'NORMAL' | 'DINERO';
  state: 'LOBBY' | 'MINIGAME' | 'PLAYING' | 'FINISHED';
  miniGameRoute?: string;
  miniGameDuration?: number;
  miniGameStartedAt?: number;
  // Questions used in the kahoot-style question rounds.
  questions: Array<{
    id: string;
    index: number;
    texto: string;
    opciones: string[];
    respuestaCorrecta: number;
  }>;
  // Disjoint subset of questions injected into the Phaser minigame (when the
  // teacher enabled "preguntas para el juego"). Empty when the minigame runs
  // without questions. Kept separate so a question never appears both in the
  // minigame and the kahoot round.
  gameQuestions?: Array<{
    id: string;
    index: number;
    texto: string;
    opciones: string[];
    respuestaCorrecta: number;
  }>;
  currentQuestionIndex: number; // Used for global 'NORMAL' mode sync
  questionStartedAt: number | null;
  answeredBy: string[];
  players: Record<string, AdaptaGPlayerState>;
}

const ROOM_TTL_SECONDS = 7200; // 2 hours

@Injectable()
export class AdaptaGRedisService implements OnModuleDestroy {
  private readonly logger = new Logger(AdaptaGRedisService.name);
  private readonly client: Redis | null;
  private readonly localFallback = new Map<string, AdaptaGRoomState>();

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('REDIS_K_URL');
    if (!url) {
      this.client = null;
      this.logger.warn('REDIS_K_URL no está configurada — Adapta-G usará la memoria local (solo para pruebas).');
      return;
    }
    this.client = new Redis(url, {
      lazyConnect: false,
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
    });
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit().catch(() => undefined);
    }
  }

  private roomKey(pin: string): string {
    return `adaptag:room:${pin}`;
  }

  async saveRoom(pin: string, state: AdaptaGRoomState): Promise<void> {
    if (!this.client) {
      this.localFallback.set(pin, state);
      return;
    }
    try {
      await this.client.set(this.roomKey(pin), JSON.stringify(state), 'EX', ROOM_TTL_SECONDS);
    } catch (err) {
      this.logger.warn(`Failed to save room ${pin}: ${err}`);
    }
  }

  async getRoom(pin: string): Promise<AdaptaGRoomState | null> {
    if (!this.client) {
      return this.localFallback.get(pin) || null;
    }
    try {
      const raw = await this.client.get(this.roomKey(pin));
      if (!raw) return null;
      return JSON.parse(raw) as AdaptaGRoomState;
    } catch (err) {
      this.logger.warn(`Failed to read room ${pin}: ${err}`);
      return null;
    }
  }

  async deleteRoom(pin: string): Promise<void> {
    if (!this.client) {
      this.localFallback.delete(pin);
      return;
    }
    try {
      await this.client.del(this.roomKey(pin));
    } catch {
      // best effort
    }
  }
}
