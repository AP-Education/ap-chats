import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { Logger } from '../logger/logger.interface';

interface ErrorBody {
  statusCode: number;
  message: unknown;
  error: string;
  requestId: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<FastifyRequest>();
    const reply = ctx.getResponse<FastifyReply>();
    const requestId = String(request.id);

    const body = buildErrorBody(exception, requestId);

    // Only genuinely unexpected (5xx) failures get logged as errors here — a 400 from
    // ValidationPipe or a 401 from AuthGuard is expected traffic, not an incident.
    if (body.statusCode >= 500) {
      this.logger.error(
        {
          requestId,
          method: request.method,
          url: request.url,
          statusCode: body.statusCode,
          err: exception,
        },
        'Unhandled request error',
      );
    }

    void reply.status(body.statusCode).header('x-request-id', requestId).send(body);
  }
}

function buildErrorBody(exception: unknown, requestId: string): ErrorBody {
  if (exception instanceof HttpException) {
    const statusCode = exception.getStatus();
    const response = exception.getResponse();
    if (typeof response === 'object' && response !== null) {
      const body = response as Partial<ErrorBody>;
      return { message: exception.message, ...body, statusCode, error: exception.name, requestId };
    }
    return { statusCode, message: response, error: exception.name, requestId };
  }

  // Never leak internals (stack traces, DB errors, etc.) to the client — only the log line above carries them.
  return {
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Internal server error',
    error: 'Internal Server Error',
    requestId,
  };
}
