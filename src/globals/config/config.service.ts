import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AppConfig } from './config.schema';

@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config.get(key, { infer: true });
  }

  /** This instance runs push work: push is on and it is not an HTTP-only instance. */
  runsPushWorkers(): boolean {
    return this.get('PUSH_ENABLED') && this.get('PUSH_WORKER_ENABLED');
  }
}
