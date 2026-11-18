import path from 'node:path';

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  timeout: 30000,
  workers: 1,
  outputDir: '../../test-results/composer-intents',
  use: { baseURL: 'http://127.0.0.1:5587', headless: true, trace: 'retain-on-failure' },
  projects: [
    {
      name: 'phone',
      use: {
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'narrow',
      use: {
        browserName: 'chromium',
        viewport: { width: 320, height: 568 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'webkit',
      // WebKit on CI runners stalls now and then; one retry keeps it from blocking a PR, and
      // Playwright still reports the test as flaky, with the failed attempt's trace saved.
      retries: process.env.CI ? 1 : 0,
      use: {
        browserName: 'webkit',
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    cwd: path.resolve(import.meta.dirname, '../..'),
    command: 'node node_modules/vite/bin/vite.js --config tests/composer-intents/vite.config.mts',
    url: 'http://127.0.0.1:5587',
    reuseExistingServer: !process.env.CI,
  },
});
