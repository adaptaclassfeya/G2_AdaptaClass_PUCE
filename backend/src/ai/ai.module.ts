import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerModuleOptions } from '@nestjs/throttler';
import Redis from 'ioredis';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { RedisDraftService } from './redis-draft.service';
import { RedisThrottlerStorage } from './redis-throttler.storage';
import { AiThrottlerGuard } from './ai-throttler.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    // Async so the storage adapter can pick up REDIS_URL at boot; falls
    // back to in-memory when Redis is not configured.
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): ThrottlerModuleOptions => {
        const base: ThrottlerModuleOptions = {
          // Two named buckets so AI teacher generation and student chat
          // never share a counter — different cost profiles, different
          // limits. ChatModule re-uses this storage via its own guard.
          throttlers: [
            { name: 'ai-generate', ttl: 60_000, limit: 5 },
            { name: 'chat-ask', ttl: 60_000, limit: 20 },
          ],
        };
        const url = config.get<string>('REDIS_URL');
        if (!url) return base;
        // Dedicated client so a slow throttler op cannot starve draft ops
        // (and vice versa). Lazy-connects on first use to keep cold starts
        // snappy.
        const client = new Redis(url, {
          lazyConnect: true,
          maxRetriesPerRequest: 2,
          enableOfflineQueue: false,
        });
        client.on('error', () => {
          // Suppress noisy reconnection logs; the storage adapter already
          // warns when an op fails.
        });
        return { ...base, storage: new RedisThrottlerStorage(client) };
      },
    }),
  ],
  controllers: [AiController],
  providers: [AiService, RedisDraftService, AiThrottlerGuard],
  // ThrottlerModule must be re-exported so ChatModule's guard hits the
  // same (Redis-backed) storage instance instead of a fresh in-memory
  // one — otherwise the chat-ask bucket would silently fall back to
  // per-instance counts.
  exports: [AiService, ThrottlerModule],
})
export class AiModule {}
