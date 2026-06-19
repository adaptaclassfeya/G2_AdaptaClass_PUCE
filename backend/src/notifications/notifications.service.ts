import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPending(studentId: string) {
    return this.prisma.notification.findMany({
      where: {
        student_id: studentId,
        leida: false,
      },
      orderBy: { created_at: 'desc' },
      include: {
        mission: true,
      },
    });
  }

  async markAsRead(notificationId: string, studentId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notificación no encontrada');
    }

    if (notification.student_id !== studentId) {
      throw new ForbiddenException(
        'No tienes permiso para marcar esta notificación',
      );
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { leida: true },
    });
  }
}
