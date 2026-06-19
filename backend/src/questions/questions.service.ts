import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

import { UpdateQuestionDto } from './dto/update-question.dto';

@Injectable()
export class QuestionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listSources(teacherId: string) {
    return this.prisma.questionSource.findMany({
      where: { teacher_id: teacherId },
      include: {
        _count: { select: { questions: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async listTemas(teacherId: string) {
    const records = await this.prisma.question.findMany({
      where: { teacher_id: teacherId },
      select: { tema: true },
      distinct: ['tema'],
    });
    return records.map((r) => r.tema).sort();
  }

  async listQuestions(teacherId: string, tema?: string) {
    return this.prisma.question.findMany({
      where: {
        teacher_id: teacherId,
        ...(tema ? { tema } : {}),
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async updateQuestion(
    questionId: string,
    teacherId: string,
    dto: UpdateQuestionDto,
  ) {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
    });
    if (!question || question.teacher_id !== teacherId) {
      throw new NotFoundException('Pregunta no encontrada o no autorizada');
    }
    return this.prisma.question.update({
      where: { id: questionId },
      data: dto,
    });
  }

  async deleteQuestion(questionId: string, teacherId: string) {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
    });
    if (!question || question.teacher_id !== teacherId) {
      throw new NotFoundException('Pregunta no encontrada o no autorizada');
    }
    await this.prisma.question.delete({
      where: { id: questionId },
    });
    return { ok: true };
  }
}
