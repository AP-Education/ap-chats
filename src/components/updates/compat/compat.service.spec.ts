import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { AppConfigService } from '@/globals/config';

import { CompatService } from './compat.service';

function service(values: Record<string, unknown>) {
  return new CompatService({ get: (key: string) => values[key] } as AppConfigService);
}

test('keeps every build working when nothing is configured', () => {
  assert.deepEqual(service({}).forPlatform('ios'), { minSupportedBuild: null, storeUrl: null });
});

test('answers each platform from its own settings', () => {
  const compat = service({
    UPDATES_MIN_BUILD_IOS: 12,
    UPDATES_STORE_URL_IOS: 'https://apps.apple.com/app/id1',
    UPDATES_MIN_BUILD_ANDROID: 40,
    UPDATES_STORE_URL_ANDROID: 'https://play.google.com/store/apps/details?id=x',
  });

  assert.deepEqual(compat.forPlatform('ios'), {
    minSupportedBuild: 12,
    storeUrl: 'https://apps.apple.com/app/id1',
  });
  assert.deepEqual(compat.forPlatform('android'), {
    minSupportedBuild: 40,
    storeUrl: 'https://play.google.com/store/apps/details?id=x',
  });
});
