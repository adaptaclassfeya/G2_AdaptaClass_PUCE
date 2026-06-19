import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { MissionsService } from './missions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CreateMissionDto } from './dto/create-mission.dto';

@Controller('missions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MissionsController {
  constructor(private readonly missionsService: MissionsService) {}

  @Post()
  @Roles(Role.TEACHER)
  async create(@Body() dto: CreateMissionDto, @Request() req: any) {
    return this.missionsService.create(dto, req.user.sub);
  }

  @Get('my')
  @Roles(Role.STUDENT)
  async getMyMissions(@Request() req: any) {
    return this.missionsService.getMyMissions(req.user.sub);
  }

  @Get()
  @Roles(Role.TEACHER)
  async listForTeacher(
    @Query('paralelo_id') paraleloId: string,
    @Request() req: any,
  ) {
    return this.missionsService.listForTeacher(req.user.sub, paraleloId);
  }

  @Get(':id/progress')
  @Roles(Role.TEACHER)
  async getProgressDetail(@Param('id') id: string, @Request() req: any) {
    return this.missionsService.getProgressDetail(id, req.user.sub);
  }

  @Delete(':id')
  @Roles(Role.TEACHER)
  async remove(@Param('id') id: string, @Request() req: any) {
    return this.missionsService.remove(id, req.user.sub);
  }
}
