import 'reflect-metadata';

import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import type { Http2ServerRequest } from 'node:http2';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { AppConfigService } from './globals/config/config.service';
import { ConnectSocketIoAdapter } from './globals/realtime/socket-io.adapter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      genReqId: (request: IncomingMessage | Http2ServerRequest) => {
        const requestId = randomUUID();
        (request as typeof request & { id?: string }).id = requestId;
        return requestId;
      },
    }),
    {
      bufferLogs: true,
    },
  );
  app.useLogger(app.get(Logger));
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  const config = app.get(AppConfigService);
  app.enableCors({ origin: config.get('WEB_ORIGIN') });
  app.useWebSocketAdapter(new ConnectSocketIoAdapter(app, config));
  app.setGlobalPrefix('api');
  await app.listen(config.get('API_PORT'), '0.0.0.0');
}

void bootstrap();
