import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { timingSafeEqual } from 'crypto';
import type { Request } from 'express';
import { CSRF_COOKIE, CSRF_HEADER, parseCookies } from './cookies';
import { CSRF_SKIP_KEY } from './skip-csrf.decorator';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Double-submit cookie CSRF guard.
 *
 * Browsers attach the httpOnly access cookie automatically on any
 * same-site request, so we additionally require an X-CSRF-Token header
 * that matches the (non-httpOnly) csrf_token cookie. A cross-site attacker
 * can trigger the browser to send the cookies but cannot read the cookie
 * value to forge the header — same-origin policy blocks them.
 *
 * Safe methods (GET/HEAD/OPTIONS) and explicitly @SkipCsrf()-marked
 * handlers (login, register) are exempt.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(req.method.toUpperCase())) return true;

    const skip = this.reflector.getAllAndOverride<boolean>(CSRF_SKIP_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return true;

    const cookies = parseCookies(req);
    // Keys are module-level constants, not user input — object injection false positive.
    // eslint-disable-next-line security/detect-object-injection
    const cookieToken = cookies[CSRF_COOKIE];
    // eslint-disable-next-line security/detect-object-injection
    const rawHeader = req.headers[CSRF_HEADER];
    const headerToken = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;

    if (!cookieToken || !headerToken) {
      throw new ForbiddenException('CSRF token missing.');
    }

    const a = Buffer.from(cookieToken);
    const b = Buffer.from(headerToken);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new ForbiddenException('CSRF token mismatch.');
    }
    return true;
  }
}
