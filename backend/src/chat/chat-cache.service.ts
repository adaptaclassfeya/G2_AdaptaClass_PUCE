import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import Redis from 'ioredis';

const TTL_SECONDS = 60 * 60 * 24; // 24h

// Prefix bumped manually when the system prompt or model changes — bumping
// `v1` to `v2` invalidates every cached response without needing FLUSHDB.
// See CLAUDE.md "Chatbot" / v2 plan.
const KEY_PREFIX = 'chat:llm:v1';

@Injectable()
export class ChatCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(ChatCacheService.name);
  private readonly client: Redis | null;

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('REDIS_URL');
    if (!url) {
      this.client = null;
      this.logger.warn(
        'REDIS_URL not set — chat LLM cache disabled (no-op get/set).',
      );
      return;
    }
    this.client = new Redis(url, {
      lazyConnect: false,
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
    });
    this.client.on('error', (err) => {
      this.logger.error(`Redis error: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit().catch(() => undefined);
    }
  }

  /**
   * Build a cache key from the normalized message + the paralelo id + the
   * persona name. Including persona ensures that a teacher renaming the
   * assistant invalidates that paralelo's cache (otherwise students would
   * see replies signed "Adapti" after the teacher renamed it).
   */
  private keyFor(
    normalizedMessage: string,
    paraleloId: string | null,
    personaName: string,
  ): string {
    const hash = createHash('sha256')
      .update(`${normalizedMessage}|${paraleloId ?? ''}|${personaName}`)
      .digest('hex');
    return `${KEY_PREFIX}:${hash}`;
  }

  async get(
    normalizedMessage: string,
    paraleloId: string | null,
    personaName: string,
  ): Promise<string | null> {
    if (!this.client) return null;
    try {
      return await this.client.get(
        this.keyFor(normalizedMessage, paraleloId, personaName),
      );
    } catch (err) {
      this.logger.warn(
        `cache get failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }

  async set(
    normalizedMessage: string,
    paraleloId: string | null,
    personaName: string,
    value: string,
  ): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.set(
        this.keyFor(normalizedMessage, paraleloId, personaName),
        value,
        'EX',
        TTL_SECONDS,
      );
    } catch (err) {
      this.logger.warn(
        `cache set failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
