import { Logger } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import Redis from 'ioredis';

// ThrottlerStorageRecord lives in a subpath that isn't re-exported from the
// package root, so we restate the shape here. Matches @nestjs/throttler v6.
type ThrottlerStorageRecord = {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
};

/**
 * @nestjs/throttler storage backed by ioredis so the rate limit survives
 * across serverless function instances (the default in-memory storage gives
 * each cold start its own counter, which on Vercel effectively disables the
 * throttle).
 *
 * Fails open: if Redis is unreachable, we return a record that lets the
 * request through and log a warning. Better to skip throttling than to 500
 * legitimate teacher requests because Redis hiccuped.
 */
export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly logger = new Logger(RedisThrottlerStorage.name);

  constructor(private readonly client: Redis) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    _blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const fullKey = `throttle:${throttlerName}:${key}`;
    try {
      const pipeline = this.client.multi();
      pipeline.incr(fullKey);
      pipeline.pttl(fullKey);
      const results = await pipeline.exec();
      if (!results) return this.openRecord(ttl);

      const totalHits = (results[0]?.[1] as number) ?? 1;
      let timeToExpire = (results[1]?.[1] as number) ?? -1;

      // First hit in the window — pttl is -1 until we set the expiry.
      if (timeToExpire < 0) {
        await this.client.pexpire(fullKey, ttl);
        timeToExpire = ttl;
      }

      const isBlocked = totalHits > limit;
      return {
        totalHits,
        timeToExpire,
        isBlocked,
        timeToBlockExpire: isBlocked ? timeToExpire : 0,
      };
    } catch (err) {
      this.logger.warn(
        `Throttler Redis op failed (${fullKey}): ${err instanceof Error ? err.message : String(err)} — letting request through.`,
      );
      return this.openRecord(ttl);
    }
  }

  private openRecord(ttl: number): ThrottlerStorageRecord {
    return {
      totalHits: 0,
      timeToExpire: ttl,
      isBlocked: false,
      timeToBlockExpire: 0,
    };
  }
}
