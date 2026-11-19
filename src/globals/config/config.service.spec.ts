import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { ConfigService } from '@nestjs/config';

import type { AppConfig } from './config.schema';
import { AppConfigService } from './config.service';

test('reads an empty setting as unset, as the schema means it', () => {
  // What Nest returns for a key the validated config leaves undefined: the raw process.env value.
  const raw = { UPDATES_MIN_BUILD_IOS: '', API_PORT: 3211 } as Record<string, unknown>;
  const nest = { get: (key: string) => raw[key] } as unknown as ConfigService<AppConfig, true>;
  const config = new AppConfigService(nest);

  assert.equal(config.get('UPDATES_MIN_BUILD_IOS'), undefined);
  assert.equal(config.get('API_PORT'), 3211);
});
