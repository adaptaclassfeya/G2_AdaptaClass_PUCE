import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Secondary rate limit applied ONLY to the LLM fallback inside ChatService.
 * Intentionally NOT a NestJS Guard — it runs after the intent router
 * decides the message can't be answered deterministically, so guarding
 * the controller would also block free deterministic replies.
 *
 * Why two limits? See CLAUDE.md / v2 plan: the general 20/min is for
 * server load; this 3/min is for the token budget. Cheap deterministic
 * answers shouldn't count against the expensive LLM allowance.
 *
 * Backed by Redis when configured, with an in-memory Map fallback so
 * local dev still gets the limit. Fails open on Redis errors.
 */
@Injectable()
export class LlmRateLimiterService implements OnModuleDestroy {
  private readonly logger = new Logger(LlmRateLimiterService.name);
  private readonly client: Redis | null;
  private readonly inMem = new Map<
    string,
    { count: number; resetAt: number }
  >();
  private readonly limit = 3;
  private readonly windowMs = 60_000;

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('REDIS_URL');
    if (!url) {
      this.client = null;
      return;
    }
    this.client = new Redis(url, {
      lazyConnect: false,
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
    });
    this.client.on('error', (err) => {
      this.logger.warn(`Redis error (fail-open): ${err.message}`);
    });
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit().catch(() => undefined);
    }
  }

  /**
   * Increments the user's LLM counter for the current minute window.
   * Returns true if the request is allowed, false if over the limit.
   */
  async tryConsume(userId: string): Promise<boolean> {
    if (this.client) {
      const key = `chat:llm:rl:${userId}`;
      try {
        const count = await this.client.incr(key);
        if (count === 1) {
          await this.client.pexpire(key, this.windowMs);
        }
        return count <= this.limit;
      } catch (err) {
        this.logger.warn(
          `tryConsume Redis op failed: ${err instanceof Error ? err.message : String(err)} — fail-open.`,
        );
        return true;
      }
    }

    const now = Date.now();

    // Purge expired entries periodically to prevent unbounded memory growth
    // when many students use the LLM path over the lifetime of the process.
    if (this.inMem.size > 500) {
      for (const [k, v] of this.inMem) {
        if (v.resetAt < now) this.inMem.delete(k);
      }
    }

    const entry = this.inMem.get(userId);
    if (!entry || entry.resetAt < now) {
      this.inMem.set(userId, { count: 1, resetAt: now + this.windowMs });
      return true;
    }
    entry.count += 1;
    return entry.count <= this.limit;
  }
}
