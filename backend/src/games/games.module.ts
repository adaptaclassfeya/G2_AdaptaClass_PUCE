import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GamesService } from './games.service';
import { GamesController } from './games.controller';

@Module({
  imports: [AuthModule],
  controllers: [GamesController],
  providers: [GamesService],
  exports: [GamesService],
})
export class GamesModule {}
