import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

/**
 * Global exception filter: prevents stack traces or internal error shapes
 * from leaking to clients in production while keeping useful logs server-side.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<any>();
    const request = ctx.getRequest<any>();
    const isProd = process.env.NODE_ENV === 'production';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let clientMessage: string | string[] = 'Internal server error';
    let clientError = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        clientMessage = body;
      } else if (body && typeof body === 'object') {
        const b = body as Record<string, any>;
        clientMessage = b.message ?? exception.message;
        clientError = b.error ?? clientError;
      }
    }

    // Log the error message + Prisma-specific fields explicitly. Prisma's
    // KnownRequestError prints a code snippet in its .message but stashes
    // the actual cause in .code / .meta / .cause — extract all of them so
    // we don't lose the underlying reason in production logs.
    const message =
      exception instanceof Error
        ? `${exception.name}: ${exception.message}`
        : String(exception);
    const extras: Record<string, unknown> = {};
    if (exception && typeof exception === 'object') {
      const anyErr = exception as Record<string, unknown>;
      if (anyErr.code !== undefined) extras.code = anyErr.code;
      if (anyErr.meta !== undefined) extras.meta = anyErr.meta;
      if (anyErr.cause !== undefined) {
        const cause = anyErr.cause;
        extras.cause =
          cause instanceof Error
            ? { name: cause.name, message: cause.message, stack: cause.stack }
            : cause;
      }
    }
    const extrasStr = Object.keys(extras).length
      ? ` | extras=${JSON.stringify(extras)}`
      : '';
    this.logger.error(
      `[${request?.method ?? '?'} ${request?.url ?? '?'}] -> ${status} | ${message}${extrasStr}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json({
      statusCode: status,
      error: clientError,
      message: clientMessage,
      // Never expose stack traces or low-level details to the client in prod.
      ...(isProd ? {} : { path: request?.url }),
    });
  }
}
