import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ParalelosModule } from './paralelos/paralelos.module';
import { GamesModule } from './games/games.module';
import { MissionsModule } from './missions/missions.module';
import { GameSessionsModule } from './game-sessions/game-sessions.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AiModule } from './ai/ai.module';
import { QuestionsModule } from './questions/questions.module';
import { AchievementsModule } from './achievements/achievements.module';
import { ChatModule } from './chat/chat.module';
import { PusherModule } from './pusher/pusher.module';
import { AdaptaGModule } from './adapta-g/adapta-g.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { CsrfGuard } from './common/security/csrf.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Single .env at repo root shared with the frontend (Vite).
      // VITE_* vars are ignored by NestJS; backend vars are ignored by Vite.
      // In production (Vercel) env vars come from the dashboard, not a file.
      //
      // Multiple candidate paths because nest-cli.json sets `sourceRoot: src`,
      // so the compiled file lives at `backend/dist/src/app.module.js` (NOT
      // `backend/dist/`). The first path that exists wins. Process.cwd()
      // fallback covers running from `backend/` directly.
      envFilePath: [
        require('path').resolve(__dirname, '../../../.env'), // backend/dist/src → repo root
        require('path').resolve(__dirname, '../../.env'),    // backend/dist or backend/src → repo root (legacy / direct ts-node)
        require('path').resolve(process.cwd(), '..', '.env'), // cwd=backend → repo root
      ],
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().required(),
        DIRECT_URL: Joi.string().optional(), // Required for Supabase migrations, optional for local dev
        JWT_SECRET: Joi.string().min(32).required(),
        JWT_EXPIRES_IN: Joi.string().default('7d'),
        PORT: Joi.number().default(3000),
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        // FRONTEND_URL is required in production for CORS allowlist (see main.ts).
        FRONTEND_URL: Joi.string().when('NODE_ENV', {
          is: 'production',
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
        OPENAI_API_KEY: Joi.string().optional(), // backwards-compat alias for AI_API_KEY
        AI_API_KEY: Joi.string().optional(), // preferred name (Groq / OpenAI / any compatible host)
        AI_API_URL: Joi.string()
          .uri()
          .empty('')
          .optional()
          .default('https://api.groq.com/openai/v1'),
        AI_MODEL: Joi.string().default('llama-3.3-70b-versatile'), // Override to swap models without code changes
        // Optional — when set, the AI flow persists question drafts between
        // /generate-questions and /save-questions for 30 min. Missing is fine
        // (drafts just won't survive a tab reload).
        REDIS_URL: Joi.string()
          .uri({ scheme: ['redis', 'rediss'] })
          .empty('')
          .optional(),
      })
        // Require at least one AI key so the AiService never starts unauthenticated.
        .or('AI_API_KEY', 'OPENAI_API_KEY'),
    }),
    PrismaModule,
    AuthModule,
    ParalelosModule,
    GamesModule,
    MissionsModule,
    GameSessionsModule,
    NotificationsModule,
    AiModule,
    QuestionsModule,
    AchievementsModule,
    ChatModule,
    PusherModule,
    AdaptaGModule,
    DashboardModule,
  ],
  providers: [
    // Global double-submit CSRF guard. Runs on every request; safe methods
    // and handlers marked @SkipCsrf() (login, register) bypass it.
    { provide: APP_GUARD, useClass: CsrfGuard },
  ],
})
export class AppModule {}
