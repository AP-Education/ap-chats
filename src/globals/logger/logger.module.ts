import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

import { Global, Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

import { AppConfigModule } from '../config/config.module';
import { AppConfigService } from '../config/config.service';
import { LogTargetFactory } from './log-target.factory';
import { Logger } from './logger.interface';
import { LoggerService } from './logger.service';

// Adapted from backend-LMS: a global logger port with child context and
// configurable output, using Chats's Fastify request IDs.
@Global()
@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        assignResponse: true,
        pinoHttp: {
          level: config.get('LOG_LEVEL'),
          base: { service: 'ap-chats-api', processInstanceId: LoggerModule.instanceId },
          redact: {
            paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
            remove: true,
          },
          genReqId: (req: IncomingMessage, res: ServerResponse) => {
            const requestId = typeof req.id === 'string' ? req.id : randomUUID();
            res.setHeader('x-request-id', requestId);
            return requestId;
          },
          customProps: (req: IncomingMessage) => ({
            requestId: typeof req.id === 'string' ? req.id : undefined,
            traceId: LoggerModule.traceId(req),
            correlationId:
              LoggerModule.header(req, 'x-correlation-id') ??
              (typeof req.id === 'string' ? req.id : undefined),
          }),
          customLogLevel: (_req: IncomingMessage, res: ServerResponse, error?: Error) =>
            error || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
          transport: LogTargetFactory.create({
            type: config.get('LOG_TARGET_TYPE'),
            destination: config.get('LOG_TARGET_DEST'),
            level: config.get('LOG_LEVEL'),
            format:
              config.get('LOG_TRANSPORT') ??
              (config.get('NODE_ENV') === 'development' ? 'pretty' : 'json'),
          }),
        },
      }),
    }),
  ],
  providers: [{ provide: Logger, useClass: LoggerService }],
  exports: [PinoLoggerModule, Logger],
})
export class LoggerModule {
  private static readonly instanceId = randomUUID();

  private static header(req: IncomingMessage, name: string): string | undefined {
    const value = req.headers[name];
    return (Array.isArray(value) ? value[0] : value)?.slice(0, 128);
  }

  private static traceId(req: IncomingMessage): string | undefined {
    const explicit = this.header(req, 'x-trace-id');
    if (explicit) return explicit;
    const traceparent = this.header(req, 'traceparent');
    const parts = traceparent?.split('-');
    return parts?.length === 4 && parts[1]?.length === 32 ? parts[1] : undefined;
  }
}
