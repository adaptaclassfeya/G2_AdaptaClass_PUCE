import type { Request } from 'express';

/**
 * Extends Express Request with the JWT payload injected by JwtAuthGuard.
 * Use this instead of `@Request() req: any` in controllers that need
 * to access req.user — eliminates unsafe `any` member access.
 */
export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}
