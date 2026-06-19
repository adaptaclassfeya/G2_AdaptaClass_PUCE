import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ParalelosService } from './paralelos.service';
import { CreateParaleloDto, JoinParaleloDto } from './dto/paralelos.dto';
import { UpdateChatbotConfigDto } from '../chat/dto/update-chatbot-config.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import type { AuthenticatedRequest } from '../common/types/authenticated-request';

@Controller('paralelos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ParalelosController {
  constructor(private readonly paralelosService: ParalelosService) {}

  @Post()
  @Roles(Role.TEACHER)
  async create(
    @Body() dto: CreateParaleloDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.paralelosService.create(dto, req.user.sub);
  }

  @Post('join')
  @Roles(Role.STUDENT)
  async join(
    @Body() dto: JoinParaleloDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.paralelosService.join(dto, req.user.sub);
  }

  // Student-initiated leave. Idempotent so it's safe to call from a
  // "Salir del paralelo" button even if the SPA state is stale.
  @Post('leave')
  @Roles(Role.STUDENT)
  async leave(@Request() req: AuthenticatedRequest) {
    return this.paralelosService.leave(req.user.sub);
  }

  @Get()
  @Roles(Role.TEACHER)
  async findAll(@Request() req: AuthenticatedRequest) {
    return this.paralelosService.findAllForTeacher(req.user.sub);
  }

  @Get(':id')
  @Roles(Role.TEACHER)
  async findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.paralelosService.findOne(id, req.user.sub);
  }

  @Get(':id/ranking')
  async getRanking(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.paralelosService.ranking(
      id,
      req.user.sub,
      req.user.role as 'TEACHER' | 'STUDENT',
    );
  }

  @Patch(':id/rotate-code')
  @Roles(Role.TEACHER)
  async rotateCode(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.paralelosService.rotateCode(id, req.user.sub);
  }

  // ─── Chatbot config (per-paralelo, teacher-managed) ─────────────────
  // GET returns the full config so the teacher panel can render its
  // initial state without guessing defaults. PATCH accepts a partial.

  @Get(':id/chatbot-config')
  @Roles(Role.TEACHER)
  async getChatbotConfig(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.paralelosService.getChatbotConfig(id, req.user.sub);
  }

  @Patch(':id/chatbot-config')
  @Roles(Role.TEACHER)
  async updateChatbotConfig(
    @Param('id') id: string,
    @Body() dto: UpdateChatbotConfigDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.paralelosService.updateChatbotConfig(id, req.user.sub, dto);
  }
}
