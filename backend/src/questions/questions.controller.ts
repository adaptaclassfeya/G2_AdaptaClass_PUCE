import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { UpdateQuestionDto } from './dto/update-question.dto';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TEACHER)
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get('question-sources')
  async getQuestionSources(@Request() req: any) {
    return this.questionsService.listSources(req.user.sub);
  }

  @Get('temas')
  async getTemas(@Request() req: any) {
    return this.questionsService.listTemas(req.user.sub);
  }

  @Get('questions')
  async getQuestions(@Query('tema') tema: string, @Request() req: any) {
    return this.questionsService.listQuestions(req.user.sub, tema);
  }

  @Patch('questions/:id')
  async updateQuestion(
    @Param('id') id: string,
    @Body() dto: UpdateQuestionDto,
    @Request() req: any,
  ) {
    return this.questionsService.updateQuestion(id, req.user.sub, dto);
  }

  @Delete('questions/:id')
  async deleteQuestion(@Param('id') id: string, @Request() req: any) {
    return this.questionsService.deleteQuestion(id, req.user.sub);
  }
}
