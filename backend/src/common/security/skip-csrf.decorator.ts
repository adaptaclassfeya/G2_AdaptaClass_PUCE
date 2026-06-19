import { SetMetadata } from '@nestjs/common';

/**
 * Mark a controller handler as exempt from the global CsrfGuard.
 * Use only on endpoints that bootstrap a session (login, register)
 * where the client cannot yet possess a CSRF token.
 */
export const CSRF_SKIP_KEY = 'csrf:skip';
export const SkipCsrf = (): MethodDecorator & ClassDecorator =>
  SetMetadata(CSRF_SKIP_KEY, true);
