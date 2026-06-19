import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { GamesService } from './games.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('games')
@UseGuards(JwtAuthGuard)
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Get()
  async findAll(@Request() req: any) {
    return this.gamesService.findAllForUser(req.user.sub, req.user.role);
  }

  @Get(':id/questions')
  async getGameQuestions(@Param('id') gameId: string, @Request() req: any) {
    return this.gamesService.getQuestionsForUser(
      gameId,
      req.user.sub,
      req.user.role,
    );
  }
}
