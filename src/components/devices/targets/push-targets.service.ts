import { Injectable } from '@nestjs/common';

import { BrowserPushTargetsStrategy } from './browser-push-targets.strategy';
import { NativePushTargetsStrategy } from './native-push-targets.strategy';
import type { PushTargetReference } from './types';

@Injectable()
export class PushTargetsService {
  constructor(
    private readonly native: NativePushTargetsStrategy,
    private readonly browser: BrowserPushTargetsStrategy,
  ) {}

  async listMessageTargetsForUser(
    userId: string,
    browserEnabled: boolean,
  ): Promise<PushTargetReference[]> {
    const [native, browser] = await Promise.all([
      this.native.listMessageTargetsForUser(userId),
      browserEnabled ? this.browser.listMessageTargetsForUser(userId) : [],
    ]);

    return [...native, ...browser];
  }
}
