import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async deleteUserAndRelations(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { teacher: true, student: true },
    });
    if (!user) return;

    if (user.role === Role.STUDENT) {
      // Delete unlocked achievements
      await this.prisma.studentAchievement.deleteMany({
        where: { student_id: userId },
      });
      // Delete student question attempts
      await this.prisma.questionAttempt.deleteMany({
        where: { student_id: userId },
      });
      // Delete student game sessions
      await this.prisma.gameSession.deleteMany({
        where: { student_id: userId },
      });
      // Delete student mission progress
      await this.prisma.studentMissionProgress.deleteMany({
        where: { student_id: userId },
      });
      // Delete notifications
      await this.prisma.notification.deleteMany({
        where: { student_id: userId },
      });
      // Delete student
      await this.prisma.student.delete({
        where: { user_id: userId },
      });
    } else if (user.role === Role.TEACHER) {
      // Find all paralelos created by this teacher
      const paralelos = await this.prisma.paralelo.findMany({
        where: { teacher_id: userId },
      });
      const paraleloIds = paralelos.map((p) => p.id);

      // Delete student mission progress for missions in these paralelos
      await this.prisma.studentMissionProgress.deleteMany({
        where: {
          mission: {
            paralelo_id: { in: paraleloIds },
          },
        },
      });

      // Delete notifications for missions in these paralelos
      await this.prisma.notification.deleteMany({
        where: {
          mission: {
            paralelo_id: { in: paraleloIds },
          },
        },
      });

      // Delete missions in these paralelos
      await this.prisma.mission.deleteMany({
        where: { paralelo_id: { in: paraleloIds } },
      });

      // Delete missions created by teacher directly
      await this.prisma.mission.deleteMany({
        where: { created_by: userId },
      });

      // Set paralelo_id to null for students in these paralelos
      await this.prisma.student.updateMany({
        where: { paralelo_id: { in: paraleloIds } },
        data: { paralelo_id: null },
      });

      // Delete questions created by this teacher
      await this.prisma.question.deleteMany({
        where: { teacher_id: userId },
      });

      // Delete question sources created by this teacher
      await this.prisma.questionSource.deleteMany({
        where: { teacher_id: userId },
      });

      // Delete paralelos
      await this.prisma.paralelo.deleteMany({
        where: { teacher_id: userId },
      });

      // Delete teacher
      await this.prisma.teacher.delete({
        where: { user_id: userId },
      });
    }

    // Finally delete the user
    await this.prisma.user.delete({
      where: { id: userId },
    });
  }

  getAuthResponse(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      user: this.toAuthUser(user),
    };
  }

  /**
   * Used by GET /auth/me to rehydrate the SPA after a refresh,
   * without exposing the JWT to JavaScript.
   */
  async findById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { teacher: true, student: true },
    });
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }
    return this.toAuthUser(user);
  }

  /**
   * Single projection of the User aggregate into the shape the SPA consumes.
   * Includes the gamification fields (`puntos_xp`, `racha_dias`) so the
   * student dashboard can render real progress instead of placeholders.
   */
  private toAuthUser(user: any) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      nombre: user.teacher?.nombre || user.student?.nombre,
      paralelo_id: user.student?.paralelo_id ?? null,
      puntos_xp: user.student?.puntos_xp ?? 0,
      racha_dias: user.student?.racha_dias ?? 0,
    };
  }

  async register(dto: RegisterDto) {
    const password_hash = await bcrypt.hash(dto.password, 10);
    const role: Role = dto.isDocente ? Role.TEACHER : Role.STUDENT;

    // 1. Check if there is an existing user with this email
    const existingUserByEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { student: true, teacher: true },
    });

    if (existingUserByEmail) {
      if (existingUserByEmail.role === role) {
        // Same role — update password and name
        if (role === Role.TEACHER) {
          const updatedUser = await this.prisma.user.update({
            where: { id: existingUserByEmail.id },
            data: {
              password_hash,
              teacher: { update: { nombre: dto.nombre } },
            },
            include: { student: true, teacher: true },
          });
          return this.getAuthResponse(updatedUser);
        } else {
          const updatedUser = await this.prisma.user.update({
            where: { id: existingUserByEmail.id },
            data: {
              password_hash,
              student: { update: { nombre: dto.nombre } },
            },
            include: { student: true, teacher: true },
          });
          return this.getAuthResponse(updatedUser);
        }
      } else {
        // Role changed — delete old user and recreate
        await this.deleteUserAndRelations(existingUserByEmail.id);
      }
    }

    // 2. Create a brand new user
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password_hash,
        role,
        ...(role === Role.TEACHER
          ? { teacher: { create: { nombre: dto.nombre } } }
          : { student: { create: { nombre: dto.nombre } } }),
      },
      include: { student: true, teacher: true },
    });

    return this.getAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        student: true,
        teacher: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.password_hash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    // XP awarded for today's streak login. Stays 0 when the student already
    // logged in today or is a teacher.
    let streakBonusXp = 0;

    if (user.role === Role.STUDENT && user.student) {
      // Date comparisons must happen in the user's CALENDAR timezone
      // (America/Guayaquil, UTC-5), not UTC. Reason: between 19:00 and
      // 23:59 Ecuador local, UTC has already rolled over to "tomorrow",
      // so a previous version of this code that compared UTC date strings
      // counted every evening login as a new streak day.
      //
      // Implementation: use Intl.DateTimeFormat with en-CA (emits
      // YYYY-MM-DD) anchored to America/Guayaquil for `todayKey`.
      // `last_login_date` is a @db.Date column — Prisma returns it as UTC
      // midnight of the stored day, so `.toISOString().slice(0,10)` round-
      // trips back to the same key we wrote at the previous login, and
      // the two strings are directly comparable.
      const ECUADOR_TZ = 'America/Guayaquil';
      const ecuadorDayFmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: ECUADOR_TZ,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });

      const todayKey = ecuadorDayFmt.format(new Date());
      // Anchor we persist back to the DB. Storing UTC midnight of the
      // Ecuador day keeps Postgres @db.Date stable: it'll come back as
      // `<todayKey>T00:00:00Z`, and `.toISOString().slice(0,10)` round-
      // trips to the same `todayKey` on the next login.
      const todayAnchor = new Date(`${todayKey}T00:00:00.000Z`);

      // The streak value after this login, or null when no change applies
      // (already logged in today → no bonus, no update).
      let newRacha: number | null = null;

      if (user.student.last_login_date) {
        const lastKey = user.student.last_login_date.toISOString().slice(0, 10);

        if (lastKey !== todayKey) {
          const lastAnchor = new Date(`${lastKey}T00:00:00.000Z`);
          const diffDays = Math.round(
            (todayAnchor.getTime() - lastAnchor.getTime()) /
              (1000 * 60 * 60 * 24),
          );

          if (diffDays === 1) {
            newRacha = user.student.racha_dias + 1; // streak continues
          } else {
            newRacha = 1; // streak broken, restart at today
          }
        }
        // lastKey === todayKey → already logged in today; nothing to do.
      } else {
        newRacha = 1; // first ever login
      }

      if (newRacha !== null) {
        // Daily login bonus: +10 base, +5 per full week of streak, capped
        // at +50. Awarded once per day (gated by the date check above).
        streakBonusXp = Math.min(10 + 5 * Math.floor(newRacha / 7), 50);
        await this.prisma.student.update({
          where: { user_id: user.id },
          data: {
            racha_dias: newRacha,
            last_login_date: todayAnchor,
            puntos_xp: { increment: streakBonusXp },
          },
        });
      }
    }

    // After the streak update above, reload the student so the response
    // reflects the new racha_dias / puntos_xp instead of stale values.
    const refreshed =
      user.role === Role.STUDENT
        ? await this.prisma.user.findUnique({
            where: { id: user.id },
            include: { student: true, teacher: true },
          })
        : user;

    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      user: this.toAuthUser(refreshed ?? user),
      streak_bonus_xp: streakBonusXp,
    };
  }
}
