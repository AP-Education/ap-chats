import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'starme.spec.ts',
  fullyParallel: true,
  workers: 2,
  timeout: 45_000,
  outputDir: '../../../test-results/starme',
  use: { baseURL: 'http://127.0.0.1:5575', headless: true, trace: 'retain-on-failure' },
  projects: [
    {
      name: 'desktop',
      use: {
        browserName: 'chromium',
        viewport: { width: 1280, height: 850 },
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
      name: 'narrow',
      use: {
        browserName: 'chromium',
        viewport: { width: 320, height: 740 },
        isMobile: true,
        hasTouch: true,
        launchOptions: { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH },
      },
    },
    {
      name: 'safari',
      use: {
        browserName: 'webkit',
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: [
    {
      command: 'node --import tsx web/tests/starme/serve-api.cts',
      cwd: '../../..',
      port: 5576,
      timeout: 60_000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'node web/node_modules/vite/bin/vite.js --config web/tests/starme/vite.config.mts',
      cwd: '../../..',
      port: 5575,
      timeout: 60_000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
