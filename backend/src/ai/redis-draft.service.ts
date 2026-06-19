import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export type DraftPayload = {
  questions: unknown[];
  sourceHash: string;
};

const DRAFT_TTL_SECONDS = 1800;

@Injectable()
export class RedisDraftService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisDraftService.name);
  private readonly client: Redis | null;

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('REDIS_URL');
    if (!url) {
      this.client = null;
      this.logger.warn(
        'REDIS_URL not set — AI question drafts will be disabled.',
      );
      return;
    }
    this.client = new Redis(url, {
      lazyConnect: false,
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
    });
    this.client.on('error', (err) => {
      this.logger.error(`Redis connection error: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit().catch(() => undefined);
    }
  }

  private draftKey(teacherId: string, sourceHash: string): string {
    return `draft:${teacherId}:${sourceHash}`;
  }

  async saveDraft(
    teacherId: string,
    sourceHash: string,
    payload: DraftPayload,
  ): Promise<void> {
    if (!this.client) return;
    const key = this.draftKey(teacherId, sourceHash);
    try {
      await this.client.set(
        key,
        JSON.stringify(payload),
        'EX',
        DRAFT_TTL_SECONDS,
      );
    } catch (err) {
      this.logger.warn(
        `Failed to save draft ${key}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async readDraft(
    teacherId: string,
    sourceHash: string,
  ): Promise<DraftPayload | null> {
    if (!this.client) return null;
    const key = this.draftKey(teacherId, sourceHash);
    try {
      const raw = await this.client.get(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        Array.isArray(parsed.questions) &&
        typeof parsed.sourceHash === 'string'
      ) {
        return parsed as DraftPayload;
      }
      return null;
    } catch (err) {
      this.logger.warn(
        `Failed to read draft ${key}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }

  async clearDraft(teacherId: string, sourceHash: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.del(this.draftKey(teacherId, sourceHash));
    } catch {
      // best-effort cleanup; ignore failures.
    }
  }
}
