import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateParaleloDto, JoinParaleloDto } from './dto/paralelos.dto';
import { UpdateChatbotConfigDto } from '../chat/dto/update-chatbot-config.dto';

@Injectable()
export class ParalelosService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a 6-character alphanumeric access code.
   * Excludes confusing characters: O, 0, I, 1.
   * Uses crypto.randomInt (CSPRNG) — this code grants classroom access so
   * Math.random would be guessable and is treated as an unprotected credential.
   */
  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(randomInt(0, chars.length));
    }
    return code;
  }

  /**
   * Generate a unique code that doesn't exist among active paralelos.
   */
  private async generateUniqueCode(): Promise<string> {
    let code: string;
    let attempts = 0;
    do {
      code = this.generateCode();
      const existing = await this.prisma.paralelo.findUnique({
        where: { codigo_acceso: code },
      });
      if (!existing) return code;
      attempts++;
    } while (attempts < 10);
    throw new Error('No se pudo generar un código único');
  }

  async create(dto: CreateParaleloDto, teacherId: string) {
    const codigoAcceso = await this.generateUniqueCode();

    return this.prisma.paralelo.create({
      data: {
        nombre: dto.nombre,
        grado: dto.grado,
        teacher_id: teacherId,
        codigo_acceso: codigoAcceso,
      },
    });
  }

  async join(dto: JoinParaleloDto, studentUserId: string) {
    const paralelo = await this.prisma.paralelo.findUnique({
      where: { codigo_acceso: dto.codigo_acceso.toUpperCase() },
    });

    if (!paralelo) {
      throw new NotFoundException('Código no encontrado');
    }

    const student = await this.prisma.student.findUnique({
      where: { user_id: studentUserId },
    });

    if (!student) {
      // Should never happen if auth is correct, but guard anyway
      throw new BadRequestException('Perfil de estudiante no encontrado');
    }

    if (student.paralelo_id) {
      throw new ConflictException(
        'Ya perteneces a un paralelo. Debes salir del actual antes de unirte a otro.',
      );
    }

    return this.prisma.student.update({
      where: { user_id: studentUserId },
      data: { paralelo_id: paralelo.id },
      include: { paralelo: true },
    });
  }

  /**
   * Student leaves their current paralelo (sets paralelo_id = null).
   * Idempotent: if already detached, no-op.
   */
  async leave(studentUserId: string) {
    const student = await this.prisma.student.findUnique({
      where: { user_id: studentUserId },
    });
    if (!student) {
      throw new BadRequestException('Perfil de estudiante no encontrado');
    }
    if (!student.paralelo_id) {
      return { ok: true, alreadyOut: true };
    }
    await this.prisma.student.update({
      where: { user_id: studentUserId },
      data: { paralelo_id: null },
    });
    return { ok: true, alreadyOut: false };
  }

  /**
   * Scoped list for a single teacher. The `activo` column is kept in the
   * schema for legacy reasons but the archived/unarchived UX was removed —
   * every paralelo of a teacher is now returned regardless of `activo`.
   */
  async findAllForTeacher(teacherId: string) {
    return this.prisma.paralelo.findMany({
      where: { teacher_id: teacherId },
      include: {
        _count: { select: { students: true } },
        teacher: { include: { teacher: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string, teacherId: string) {
    const paralelo = await this.prisma.paralelo.findUnique({
      where: { id },
      include: {
        students: {
          include: { user: { select: { email: true } } },
          orderBy: { nombre: 'asc' },
        },
        _count: { select: { students: true } },
      },
    });

    if (!paralelo) {
      throw new NotFoundException('Paralelo no encontrado');
    }
    if (paralelo.teacher_id !== teacherId) {
      throw new ForbiddenException('Este paralelo no te pertenece');
    }

    return paralelo;
  }

  /**
   * Rotate the access code (e.g. when the previous one leaked). Old code
   * stops working immediately; existing students stay attached because we
   * key them by paralelo_id, not by code.
   */
  async rotateCode(id: string, teacherId: string) {
    const paralelo = await this.prisma.paralelo.findUnique({ where: { id } });
    if (!paralelo) {
      throw new NotFoundException('Paralelo no encontrado');
    }
    if (paralelo.teacher_id !== teacherId) {
      throw new ForbiddenException('Este paralelo no te pertenece');
    }
    const newCode = await this.generateUniqueCode();
    return this.prisma.paralelo.update({
      where: { id },
      data: { codigo_acceso: newCode },
    });
  }

  /**
   * Ranking by XP for a paralelo. Auth: a teacher can only inspect their
   * own paralelos; a student gets their own paralelo (regardless of id
   * passed — we resolve from the student record).
   */
  async ranking(
    id: string,
    requesterId: string,
    requesterRole: 'TEACHER' | 'STUDENT',
  ) {
    const paralelo = await this.prisma.paralelo.findUnique({ where: { id } });
    if (!paralelo) throw new NotFoundException('Paralelo no encontrado');

    if (requesterRole === 'TEACHER' && paralelo.teacher_id !== requesterId) {
      throw new ForbiddenException('Este paralelo no te pertenece');
    }
    if (requesterRole === 'STUDENT') {
      const student = await this.prisma.student.findUnique({
        where: { user_id: requesterId },
      });
      if (!student || student.paralelo_id !== id) {
        throw new ForbiddenException('No perteneces a este paralelo');
      }
    }

    const students = await this.prisma.student.findMany({
      where: { paralelo_id: id },
      orderBy: [{ puntos_xp: 'desc' }, { nombre: 'asc' }],
      select: {
        user_id: true,
        nombre: true,
        puntos_xp: true,
        racha_dias: true,
      },
    });

    return students.map((s, index) => ({
      rank: index + 1,
      user_id: s.user_id,
      nombre: s.nombre,
      puntos_xp: s.puntos_xp,
      racha_dias: s.racha_dias,
    }));
  }

  /**
   * Read the chatbot config for a paralelo (teacher view). The student
   * view goes through ChatService.getConfigForStudent which only exposes
   * fields the FAB needs.
   */
  async getChatbotConfig(paraleloId: string, teacherId: string) {
    const paralelo = await this.prisma.paralelo.findUnique({
      where: { id: paraleloId },
      select: {
        teacher_id: true,
        chatbot_enabled: true,
        chatbot_llm_enabled: true,
        chatbot_persona_name: true,
        chatbot_extra_suggestions: true,
      },
    });
    if (!paralelo) throw new NotFoundException('Paralelo no encontrado');
    if (paralelo.teacher_id !== teacherId) {
      throw new ForbiddenException('Este paralelo no te pertenece');
    }
    return {
      chatbot_enabled: paralelo.chatbot_enabled,
      chatbot_llm_enabled: paralelo.chatbot_llm_enabled,
      chatbot_persona_name: paralelo.chatbot_persona_name,
      chatbot_extra_suggestions: (paralelo.chatbot_extra_suggestions as string[]) ?? [],
    };
  }

  /**
   * Update chatbot config. Ownership is enforced — a teacher can only
   * touch their own paralelos. Each DTO field is optional so the panel
   * can patch only what changed.
   */
  async updateChatbotConfig(
    paraleloId: string,
    teacherId: string,
    dto: UpdateChatbotConfigDto,
  ) {
    const paralelo = await this.prisma.paralelo.findUnique({
      where: { id: paraleloId },
      select: { teacher_id: true },
    });
    if (!paralelo) throw new NotFoundException('Paralelo no encontrado');
    if (paralelo.teacher_id !== teacherId) {
      throw new ForbiddenException('Este paralelo no te pertenece');
    }

    const data: Record<string, unknown> = {};
    if (dto.chatbot_enabled !== undefined)
      data.chatbot_enabled = dto.chatbot_enabled;
    if (dto.chatbot_llm_enabled !== undefined)
      data.chatbot_llm_enabled = dto.chatbot_llm_enabled;
    if (dto.chatbot_persona_name !== undefined)
      data.chatbot_persona_name = dto.chatbot_persona_name;
    if (dto.chatbot_extra_suggestions !== undefined) {
      // Defensive trim — drop empty strings after the class-validator
      // pass so storing the array doesn't reserve UI space for blanks.
      data.chatbot_extra_suggestions = dto.chatbot_extra_suggestions
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    }

    const updated = await this.prisma.paralelo.update({
      where: { id: paraleloId },
      data,
      select: {
        chatbot_enabled: true,
        chatbot_llm_enabled: true,
        chatbot_persona_name: true,
        chatbot_extra_suggestions: true,
      },
    });
    return {
      chatbot_enabled: updated.chatbot_enabled,
      chatbot_llm_enabled: updated.chatbot_llm_enabled,
      chatbot_persona_name: updated.chatbot_persona_name,
      chatbot_extra_suggestions: (updated.chatbot_extra_suggestions as string[]) ?? [],
    };
  }
}
