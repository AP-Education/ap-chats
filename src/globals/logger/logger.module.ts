import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';

import { AppConfigModule } from '../config/config.module';
import { AppConfigService } from '../config/config.service';

// Adapted locally from backend-LMS/src/globals/logger. Its request ID and
// redaction conventions matter; extra LMS targets/trace fields can wait.
@Module({
  imports: [
    LoggerModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        pinoHttp: {
          level: config.get('LOG_LEVEL'),
          base: { service: 'ap-connect-api' },
          ...(config.get('NODE_ENV') === 'development'
            ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
            : {}),
          redact: {
            paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
            remove: true,
          },
          customLogLevel: (_req, res, error) =>
            error || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
        },
      }),
    }),
  ],
  exports: [LoggerModule],
})
export class AppLoggerModule {}
