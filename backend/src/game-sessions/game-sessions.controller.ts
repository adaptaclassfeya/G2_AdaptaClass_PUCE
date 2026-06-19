import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { GameSessionsService } from './game-sessions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CreateSessionDto } from './dto/create-session.dto';
import { HeartbeatDto } from './dto/heartbeat.dto';
import { AttemptDto } from './dto/attempt.dto';

@Controller('game-sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GameSessionsController {
  constructor(private readonly gameSessionsService: GameSessionsService) {}

  @Post()
  @Roles(Role.STUDENT)
  async createSession(@Body() dto: CreateSessionDto, @Request() req: any) {
    return this.gameSessionsService.createSession(dto, req.user.sub);
  }

  @Get(':id')
  @Roles(Role.STUDENT)
  async getSession(@Param('id') id: string, @Request() req: any) {
    return this.gameSessionsService.findOne(id, req.user.sub);
  }

  @Post(':id/heartbeat')
  @Roles(Role.STUDENT)
  async processHeartbeat(
    @Param('id') id: string,
    @Body() dto: HeartbeatDto,
    @Request() req: any,
  ) {
    return this.gameSessionsService.processHeartbeat(id, dto, req.user.sub);
  }

  @Post(':id/attempt')
  @Roles(Role.STUDENT)
  async registerAttempt(
    @Param('id') id: string,
    @Body() dto: AttemptDto,
    @Request() req: any,
  ) {
    return this.gameSessionsService.registerAttempt(id, dto, req.user.sub);
  }
}
