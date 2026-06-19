import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AdaptaGService } from './adapta-g.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('adapta-g')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdaptaGController {
  constructor(private readonly adaptaGService: AdaptaGService) {}

  @Get(':pin')
  @Roles(Role.TEACHER, Role.STUDENT)
  async getRoomState(@Param('pin') pin: string) {
    return this.adaptaGService.getRoomState(pin);
  }

  @Post('create')
  @Roles(Role.TEACHER)
  async createRoom(
    @Request() req: any,
    @Body('questionCount') questionCount: number,
    @Body('mode') mode?: 'NORMAL' | 'DINERO',
    @Body('miniGameRoute') miniGameRoute?: string,
    @Body('miniGameDuration') miniGameDuration?: number,
    @Body('paraleloId') paraleloId?: string,
    @Body('gameQuestionCount') gameQuestionCount?: number,
  ) {
    return this.adaptaGService.createRoom(
      req.user.sub,
      questionCount,
      mode,
      miniGameRoute,
      miniGameDuration,
      paraleloId,
      gameQuestionCount ?? 0,
    );
  }

  @Post(':pin/join')
  @Roles(Role.STUDENT)
  async joinRoom(
    @Request() req: any,
    @Param('pin') pin: string,
  ) {
    return this.adaptaGService.joinRoom(pin, req.user.nombre || req.user.email, req.user.sub);
  }

  @Post(':pin/start-minigame')
  @Roles(Role.TEACHER)
  async startMiniGame(
    @Request() req: any,
    @Param('pin') pin: string,
  ) {
    return this.adaptaGService.startMiniGame(pin, req.user.sub);
  }

  @Post(':pin/minigame-tick')
  @Roles(Role.STUDENT)
  async miniGameTick(
    @Request() req: any,
    @Param('pin') pin: string,
    @Body('points') points: number,
  ) {
    return this.adaptaGService.miniGameTick(pin, req.user.sub, points);
  }

  @Post(':pin/start-question')
  @Roles(Role.TEACHER)
  async startQuestion(
    @Request() req: any,
    @Param('pin') pin: string,
  ) {
    return this.adaptaGService.startNextQuestion(pin, req.user.sub);
  }

  @Post(':pin/answer')
  @Roles(Role.STUDENT)
  async answerQuestion(
    @Request() req: any,
    @Param('pin') pin: string,
    @Body('answerIndex') answerIndex: number,
  ) {
    return this.adaptaGService.answerQuestion(pin, req.user.sub, answerIndex);
  }
}
