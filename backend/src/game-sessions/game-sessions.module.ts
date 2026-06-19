import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MissionsModule } from '../missions/missions.module';
import { GameSessionsService } from './game-sessions.service';
import { GameSessionsController } from './game-sessions.controller';

@Module({
  imports: [AuthModule, MissionsModule],
  controllers: [GameSessionsController],
  providers: [GameSessionsService],
  exports: [GameSessionsService],
})
export class GameSessionsModule {}
