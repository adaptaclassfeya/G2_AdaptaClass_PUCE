import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

let cachedApp: any;

function buildCorsOrigins(): boolean | string[] | RegExp[] {
  // In production we require an explicit FRONTEND_URL allowlist (comma-separated).
  // In development we permit localhost / LAN dev servers but never reflect arbitrary origins.
  const isProd = process.env.NODE_ENV === 'production';
  const allowlist = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (isProd) {
    if (allowlist.length === 0) {
      throw new Error(
        'FRONTEND_URL must be set in production to a comma-separated list of allowed origins.',
      );
    }
    return allowlist;
  }

  // Development: localhost + 127.0.0.1 + LAN 10/172.16/192.168 on any port.
  // Patterns are anchored and match fixed IP structures only.
  // The dynamic RegExp escapes all special chars before constructing — safe against ReDoS.
  // Patterns are anchored and match fixed IP/hostname structures — safe.
  /* eslint-disable security/detect-unsafe-regex, security/detect-non-literal-regexp */
  return [
    /^http:\/\/localhost(:\d+)?$/,
    /^http:\/\/127\.0\.0\.1(:\d+)?$/,
    /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/,
    /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/,
    /^http:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}(:\d+)?$/,
    ...allowlist.map(
      (o) => new RegExp(`^${o.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
    ),
  ];
  /* eslint-enable security/detect-unsafe-regex, security/detect-non-literal-regexp */
}

async function bootstrap() {
  if (!cachedApp) {
    const app = await NestFactory.create(AppModule);

    // Tightened CORS — never reflect arbitrary origins back when credentials are enabled.
    app.enableCors({
      origin: buildCorsOrigins(),
      credentials: true,
    });

    // Defense-in-depth security headers (helmet equivalent — no extra dep).
    app.use((_req: any, res: any, next: () => void) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('X-XSS-Protection', '0');
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
      res.setHeader(
        'Permissions-Policy',
        'geolocation=(), microphone=(), camera=()',
      );
      // Browser default CSP for API responses — UI app ships its own CSP via index.html.
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'none'; frame-ancestors 'none'",
      );
      if (process.env.NODE_ENV === 'production') {
        res.setHeader(
          'Strict-Transport-Security',
          'max-age=31536000; includeSubDomains',
        );
      }
      res.removeHeader('X-Powered-By');
      next();
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        // Hide raw class-validator errors in production responses.
        disableErrorMessages: process.env.NODE_ENV === 'production',
      }),
    );

    app.useGlobalFilters(new AllExceptionsFilter());

    app.setGlobalPrefix('api');

    await app.init();
    cachedApp = app.getHttpAdapter().getInstance();
  }
  return cachedApp;
}

// Vercel Serverless Function export
export default async function (req: any, res: any) {
  const app = await bootstrap();
  app(req, res);
}

// Local dev execution
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  bootstrap().then((appInstance: any) => {
    const port = process.env.PORT ?? 3000;
    appInstance.listen(Number(port), '0.0.0.0', () => {
      console.log(`🚀 Backend running locally on http://0.0.0.0:${port}/api`);
    });
  });
}
