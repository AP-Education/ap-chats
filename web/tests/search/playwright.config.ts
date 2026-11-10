import path from 'node:path';

import { defineConfig } from '@playwright/test';

const chromium = { launchOptions: { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } };
export default defineConfig({
  testDir: import.meta.dirname,
  testMatch: '*.spec.ts',
  outputDir: '../../../test-results/conversation-search',
  timeout: 45_000,
  fullyParallel: true,
  use: { baseURL: 'http://127.0.0.1:5570', headless: true, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...chromium, viewport: { width: 1440, height: 900 } } },
    {
      name: 'phone',
      use: { ...chromium, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
    {
      name: 'narrow-phone',
      use: { ...chromium, viewport: { width: 320, height: 740 }, isMobile: true, hasTouch: true },
    },
    {
      name: 'webkit-phone',
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
    command: 'node node_modules/vite/bin/vite.js preview --config tests/search/vite.config.mts',
    url: 'http://127.0.0.1:5570',
    reuseExistingServer: !process.env.CI,
  },
});
