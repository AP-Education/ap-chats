import { Inject } from '@nestjs/common';
import { type Params, PARAMS_PROVIDER_TOKEN, PinoLogger } from 'nestjs-pino';
import type { Logger as PinoNativeLogger } from 'pino';

import { Logger } from './logger.interface';

class ChildLogger extends Logger {
  constructor(private native: PinoNativeLogger) {
    super();
  }

  log(message: string): void {
    this.native.info(message);
  }

  info(message: string): void;
  info(fields: Record<string, unknown>, message: string): void;
  info(fieldsOrMessage: string | Record<string, unknown>, message?: string): void {
    if (typeof fieldsOrMessage === 'string') this.native.info(fieldsOrMessage);
    else this.native.info(fieldsOrMessage, message);
  }

  warn(message: string): void;
  warn(fields: Record<string, unknown>, message: string): void;
  warn(fieldsOrMessage: string | Record<string, unknown>, message?: string): void {
    if (typeof fieldsOrMessage === 'string') this.native.warn(fieldsOrMessage);
    else this.native.warn(fieldsOrMessage, message);
  }

  error(message: string): void;
  error(fields: Record<string, unknown>, message: string): void;
  error(fieldsOrMessage: string | Record<string, unknown>, message?: string): void {
    if (typeof fieldsOrMessage === 'string') this.native.error(fieldsOrMessage);
    else this.native.error(fieldsOrMessage, message);
  }

  debug(message: string): void;
  debug(fields: Record<string, unknown>, message: string): void;
  debug(fieldsOrMessage: string | Record<string, unknown>, message?: string): void {
    if (typeof fieldsOrMessage === 'string') this.native.debug(fieldsOrMessage);
    else this.native.debug(fieldsOrMessage, message);
  }

  assign(bindings: Record<string, unknown>): void {
    this.native = this.native.child(bindings);
  }

  child(bindings: Record<string, unknown>): Logger {
    return new ChildLogger(this.native.child(bindings));
  }
}

export class LoggerService extends PinoLogger implements Logger {
  constructor(@Inject(PARAMS_PROVIDER_TOKEN) params: Params) {
    super(params);
  }

  log(message: string): void {
    this.logger.info(message);
  }

  override assign(bindings: Record<string, unknown>): void {
    super.assign(bindings);
  }

  child(bindings: Record<string, unknown>): Logger {
    return new ChildLogger(this.logger.child(bindings));
  }
}
