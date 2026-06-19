import type { Request, Response } from 'express';

export const ACCESS_COOKIE = 'access_token';
export const CSRF_COOKIE = 'csrf_token';
export const CSRF_HEADER = 'x-csrf-token';

/**
 * Parse the Cookie request header into a plain object.
 * Implemented locally to avoid adding a cookie-parser dependency.
 */
// Cookie names that could cause prototype pollution if used as object keys.
const UNSAFE_COOKIE_NAMES = new Set(['__proto__', 'constructor', 'prototype']);

export function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie;
  if (!header) return {};
  const out = Object.create(null) as Record<string, string>;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const name = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    // Skip empty names and names that could pollute the prototype chain.
    if (!name || UNSAFE_COOKIE_NAMES.has(name)) continue;
    try {
      // eslint-disable-next-line security/detect-object-injection
      out[name] = decodeURIComponent(value);
    } catch {
      // eslint-disable-next-line security/detect-object-injection
      out[name] = value;
    }
  }
  return out;
}

/**
 * Set the auth cookie (httpOnly — not readable from JS, mitigating XSS exfil)
 * and the CSRF cookie (readable from JS by the same origin so the SPA can
 * mirror it into an X-CSRF-Token header for the double-submit check).
 */
export function setAuthCookies(
  res: Response,
  accessToken: string,
  csrfToken: string,
  expiresInMs: number,
): void {
  const isProd = process.env.NODE_ENV === 'production';
  const expires = new Date(Date.now() + expiresInMs);
  const base = {
    sameSite: 'lax' as const,
    secure: isProd,
    path: '/',
    expires,
  };
  res.cookie(ACCESS_COOKIE, accessToken, { ...base, httpOnly: true });
  // CSRF token MUST be readable from JS so the SPA can echo it back.
  res.cookie(CSRF_COOKIE, csrfToken, { ...base, httpOnly: false });
}

export function clearAuthCookies(res: Response): void {
  const isProd = process.env.NODE_ENV === 'production';
  const base = { sameSite: 'lax' as const, secure: isProd, path: '/' };
  res.clearCookie(ACCESS_COOKIE, { ...base, httpOnly: true });
  res.clearCookie(CSRF_COOKIE, { ...base, httpOnly: false });
}

/**
 * Parse JWT-style duration strings ("7d", "12h", "60m", "30s") into ms.
 * Falls back to 7 days if the value can't be parsed.
 */
export function parseDurationMs(input: string | undefined): number {
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
  if (!input) return SEVEN_DAYS;
  const match = /^(\d+)([smhd])$/.exec(input.trim());
  if (!match) return SEVEN_DAYS;
  const n = parseInt(match[1], 10);
  const mult =
    match[2] === 's'
      ? 1000
      : match[2] === 'm'
        ? 60_000
        : match[2] === 'h'
          ? 3_600_000
          : 86_400_000;
  return n * mult;
}
