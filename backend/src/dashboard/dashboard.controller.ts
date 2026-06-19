import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import type { AuthenticatedRequest } from '../common/types/authenticated-request';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * Academic + engagement metrics for the teacher's classrooms.
   * `paraleloId` (optional) narrows the scope to a single paralelo; omitted
   * means "all of the teacher's students".
   */
  @Get('teacher')
  @Roles(Role.TEACHER)
  async teacherMetrics(
    @Request() req: AuthenticatedRequest,
    @Query('paraleloId') paraleloId?: string,
  ) {
    const scoped = paraleloId && paraleloId.trim() !== '' ? paraleloId : undefined;
    return this.dashboardService.getTeacherMetrics(req.user.sub, scoped);
  }

  /**
   * Platform-wide business/health metrics. ADMIN only — no per-teacher scope.
   */
  @Get('admin')
  @Roles(Role.ADMIN)
  async adminMetrics() {
    return this.dashboardService.getAdminMetrics();
  }
}
