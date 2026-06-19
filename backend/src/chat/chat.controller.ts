import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { AskChatDto } from './dto/ask-chat.dto';
import { ChatService } from './chat.service';
import { ChatThrottlerGuard } from './chat-throttler.guard';
import type { AuthenticatedRequest } from '../common/types/authenticated-request';

@Controller('chat')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * Lightweight bootstrap call made by StudentShell when the student
   * loads the app. Tells the FAB whether to render and what chips to
   * show. Cheap query (one Paralelo lookup), no LLM involved.
   */
  @Get('config')
  @Roles(Role.STUDENT)
  async getConfig(@Request() req: AuthenticatedRequest) {
    return this.chatService.getConfigForStudent(req.user.sub);
  }

  /**
   * Single chat endpoint. Throttled by user (20/min) for *any* message;
   * the LLM path adds its own per-user 3/min limit inside ChatService.
   */
  @Post('ask')
  @Roles(Role.STUDENT)
  @UseGuards(ChatThrottlerGuard)
  @Throttle({ 'chat-ask': { limit: 20, ttl: 60_000 } })
  async ask(@Body() dto: AskChatDto, @Request() req: AuthenticatedRequest) {
    return this.chatService.handle(req.user.sub, dto.message, dto.currentPath);
  }
}
