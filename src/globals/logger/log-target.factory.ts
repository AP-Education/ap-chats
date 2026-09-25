import type { TransportMultiOptions, TransportTargetOptions } from 'pino';

export interface LogTargetConfig {
  type: 'stdout' | 'file' | 'both';
  destination?: string | undefined;
  level: string;
  format: 'json' | 'pretty';
}

export class LogTargetFactory {
  static create(config: LogTargetConfig): TransportMultiOptions {
    const targets: TransportTargetOptions[] = [];

    if (config.type === 'stdout' || config.type === 'both') {
      targets.push(
        config.format === 'pretty'
          ? { target: 'pino-pretty', level: config.level, options: { colorize: true } }
          : { target: 'pino/file', level: config.level, options: { destination: 1 } },
      );
    }

    if (config.type === 'file' || config.type === 'both') {
      if (!config.destination) throw new Error('LOG_TARGET_DEST is required for file logging');
      targets.push({
        target: 'pino/file',
        level: config.level,
        options: { destination: config.destination, mkdir: true },
      });
    }

    return { targets };
  }
}
