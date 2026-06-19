import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MissionsService } from '../missions/missions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { HeartbeatDto } from './dto/heartbeat.dto';
import { AttemptDto } from './dto/attempt.dto';

@Injectable()
export class GameSessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly missionsService: MissionsService,
  ) {}

  async createSession(dto: CreateSessionDto, studentId: string) {
    return this.prisma.gameSession.create({
      data: {
        student_id: studentId,
        game_id: dto.game_id,
        minutos_jugados: 0,
        preguntas_correctas: 0,
        preguntas_intentadas: 0,
      },
    });
  }

  async processHeartbeat(
    sessionId: string,
    dto: HeartbeatDto,
    studentId: string,
  ) {
    const session = await this.prisma.gameSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.student_id !== studentId) {
      throw new NotFoundException('Sesión no encontrada o no autorizada');
    }

    const newMinutes = Number(session.minutos_jugados) + dto.played_minutes;

    const updated = await this.prisma.gameSession.update({
      where: { id: sessionId },
      data: { minutos_jugados: newMinutes },
    });

    await this.missionsService.recalculateMissionsFor(studentId);

    return updated;
  }

  async registerAttempt(sessionId: string, dto: AttemptDto, studentId: string) {
    const session = await this.prisma.gameSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.student_id !== studentId) {
      throw new NotFoundException('Sesión no encontrada o no autorizada');
    }

    const attempt = await this.prisma.questionAttempt.create({
      data: {
        student_id: studentId,
        question_id: dto.question_id,
        game_session_id: sessionId,
        correcta: dto.correcta,
      },
    });

    await this.prisma.gameSession.update({
      where: { id: sessionId },
      data: {
        preguntas_intentadas: { increment: 1 },
        ...(dto.correcta && { preguntas_correctas: { increment: 1 } }),
      },
    });

    await this.missionsService.recalculateMissionsFor(studentId);

    return attempt;
  }

  async findOne(sessionId: string, studentId: string) {
    const session = await this.prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: {
        game: true,
      },
    });

    if (!session || session.student_id !== studentId) {
      throw new NotFoundException('Sesión no encontrada o no autorizada');
    }

    return session;
  }
}
