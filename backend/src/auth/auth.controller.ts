import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SkipCsrf } from '../common/security/skip-csrf.decorator';
import {
  clearAuthCookies,
  parseDurationMs,
  setAuthCookies,
} from '../common/security/cookies';
import type { AuthenticatedRequest } from '../common/types/authenticated-request';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  @SkipCsrf()
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token, user } = await this.authService.register(dto);
    this.emitSession(res, access_token);
    res.setHeader('Cache-Control', 'no-store');
    return { user };
  }

  @Post('login')
  @SkipCsrf()
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token, user, streak_bonus_xp } =
      await this.authService.login(dto);
    this.emitSession(res, access_token);
    res.setHeader('Cache-Control', 'no-store');
    return { user, streak_bonus_xp };
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Res({ passthrough: true }) res: Response) {
    clearAuthCookies(res);
    res.setHeader('Cache-Control', 'no-store');
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: AuthenticatedRequest) {
    const user = await this.authService.findById(req.user.sub);
    return { user };
  }

  private emitSession(res: Response, accessToken: string): void {
    const csrf = randomBytes(32).toString('hex');
    const ttlMs = parseDurationMs(
      this.configService.get<string>('JWT_EXPIRES_IN', '7d'),
    );
    setAuthCookies(res, accessToken, csrf, ttlMs);
  }
}
