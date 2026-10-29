import path from 'node:path';

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: import.meta.dirname,
  testMatch: '*.spec.ts',
  outputDir: '../../../test-results/video-previews',
  timeout: 60_000,
  fullyParallel: true,
  use: {
    baseURL: 'http://127.0.0.1:5568',
    headless: true,
    trace: 'retain-on-failure',
    channel: process.env.PLAYWRIGHT_CHANNEL,
    launchOptions: { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH },
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    {
      name: 'phone',
      use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
    {
      name: 'narrow-phone',
      use: { viewport: { width: 320, height: 740 }, isMobile: true, hasTouch: true },
    },
  ],
  webServer: {
    cwd: path.resolve(import.meta.dirname, '../..'),
    command: 'node node_modules/vite/bin/vite.js preview --config tests/media/vite.config.mts',
    url: 'http://127.0.0.1:5568',
    reuseExistingServer: !process.env.CI,
  },
});
