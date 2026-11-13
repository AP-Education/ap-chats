import path from 'node:path';

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  timeout: 30_000,
  workers: 1,
  outputDir: '../../test-results/keyboard',
  use: { baseURL: 'http://127.0.0.1:5582', headless: true, trace: 'retain-on-failure' },
  projects: [
    {
      name: 'phone',
      use: {
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        launchOptions: { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH },
      },
    },
    {
      name: 'narrow',
      use: {
        browserName: 'chromium',
        viewport: { width: 320, height: 568 },
        isMobile: true,
        hasTouch: true,
        launchOptions: { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH },
      },
    },
    {
      name: 'webkit',
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
    command: 'node node_modules/vite/bin/vite.js --config tests/keyboard/vite.config.mts',
    url: 'http://127.0.0.1:5582',
    reuseExistingServer: !process.env.CI,
  },
});
