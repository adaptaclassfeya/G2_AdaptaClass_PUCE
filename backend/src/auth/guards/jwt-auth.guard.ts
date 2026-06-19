import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { ACCESS_COOKIE, parseCookies } from '../../common/security/cookies';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Token no proporcionado');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      (request as unknown as { user: unknown }).user = payload;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    return true;
  }

  /**
   * Source of truth is the httpOnly access_token cookie.
   * The Authorization: Bearer header is no longer accepted — see
   * CLAUDE.md "JWT en localStorage" for why.
   */
  private extractToken(request: Request): string | undefined {
    // ACCESS_COOKIE is a module-level constant — object injection false positive.
    // eslint-disable-next-line security/detect-object-injection
    return parseCookies(request)[ACCESS_COOKIE];
  }
}
