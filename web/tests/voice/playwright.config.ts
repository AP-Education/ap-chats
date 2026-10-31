import path from 'node:path';

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  outputDir: '../../test-results/voice',
  timeout: 35_000,
  fullyParallel: true,
  workers: 2,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5571', headless: true, trace: 'retain-on-failure' },
  projects: [
    {
      name: 'desktop',
      use: {
        browserName: 'chromium',
        viewport: { width: 1280, height: 900 },
        launchOptions: { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH },
      },
    },
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
      name: 'narrow-phone',
      use: {
        browserName: 'chromium',
        viewport: { width: 320, height: 740 },
        isMobile: true,
        hasTouch: true,
        launchOptions: { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH },
      },
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
    command: 'node node_modules/vite/bin/vite.js preview --config tests/voice/vite.config.mts',
    url: 'http://127.0.0.1:5571',
    reuseExistingServer: !process.env.CI,
  },
});
