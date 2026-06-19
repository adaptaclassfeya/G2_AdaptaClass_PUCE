import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';
import { MissionsModule } from '../missions/missions.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { GamesModule } from '../games/games.module';
import { ParalelosModule } from '../paralelos/paralelos.module';
import { AchievementsModule } from '../achievements/achievements.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatCacheService } from './chat-cache.service';
import { ChatContextBuilder } from './chat-context.builder';
import { ChatThrottlerGuard } from './chat-throttler.guard';
import { LlmRateLimiterService } from './llm-rate-limiter.service';

@Module({
  // AiModule re-exports the ThrottlerModule (registered with Redis
  // storage when REDIS_URL is set) so ChatThrottlerGuard can use the
  // same shared storage. The throttler config in AiModule already
  // includes the `chat-ask` bucket (see ai.module.ts).
  imports: [
    AuthModule,
    PrismaModule,
    AiModule,
    MissionsModule,
    NotificationsModule,
    GamesModule,
    ParalelosModule,
    AchievementsModule,
  ],
  controllers: [ChatController],
  providers: [
    ChatService,
    ChatCacheService,
    ChatContextBuilder,
    ChatThrottlerGuard,
    LlmRateLimiterService,
  ],
})
export class ChatModule {}
