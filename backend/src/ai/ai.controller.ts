import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { AiService } from './ai.service';
import { AiThrottlerGuard } from './ai-throttler.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import {
  GenerateQuestionsDto,
  SaveQuestionsDto,
} from './dto/generate-questions.dto';

// Default classification tag used when the UI no longer asks the teacher
// to pick a `tema`. The schema column is still NOT NULL — every question
// gets stamped with this so old data stays consistent.
const DEFAULT_TEMA: string = 'General';

// Defense-in-depth file upload limits.
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIMETYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
]);

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate-questions')
  @Roles(Role.TEACHER)
  @UseGuards(AiThrottlerGuard)
  @Throttle({ 'ai-generate': { limit: 5, ttl: 60_000 } })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIMETYPES.has(file.mimetype)) {
          cb(
            new BadRequestException(
              'Unsupported file type. Allowed: PDF, DOCX, DOC, TXT.',
            ),
            false,
          );
          return;
        }
        cb(null, true);
      },
    }),
  )
  async generateQuestions(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: GenerateQuestionsDto,
    @Request() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('File is required.');
    }
    const text = await this.aiService.extractText(file);
    return this.aiService.generateQuestions(
      text,
      dto.tema ?? DEFAULT_TEMA,
      dto.amount,
      dto.difficulty,
      dto.context,
      req.user.sub,
      dto.force ?? false,
      file.originalname,
      dto.paralelo_id,
    );
  }

  @Post('save-questions')
  @Roles(Role.TEACHER)
  async saveQuestions(@Body() dto: SaveQuestionsDto, @Request() req: any) {
    const userId = req.user.sub;
    return this.aiService.saveQuestions(
      dto.tema ?? DEFAULT_TEMA,
      dto.source_id ?? null,
      dto.questions ?? [],
      userId,
      dto.paralelo_id,
    );
  }
}
