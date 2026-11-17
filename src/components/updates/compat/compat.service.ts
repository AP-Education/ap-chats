import { Injectable } from '@nestjs/common';

import { AppConfigService } from '@/globals/config';

import type { ShellPlatform } from '../types';

export interface ShellCompat {
  /** Native builds below this number must update from the store; null keeps every build working. */
  minSupportedBuild: number | null;
  storeUrl: string | null;
}

@Injectable()
export class CompatService {
  constructor(private readonly config: AppConfigService) {}

  forPlatform(platform: ShellPlatform): ShellCompat {
    const ios = platform === 'ios';
    return {
      minSupportedBuild:
        this.config.get(ios ? 'UPDATES_MIN_BUILD_IOS' : 'UPDATES_MIN_BUILD_ANDROID') ?? null,
      storeUrl:
        this.config.get(ios ? 'UPDATES_STORE_URL_IOS' : 'UPDATES_STORE_URL_ANDROID') ?? null,
    };
  }
}
