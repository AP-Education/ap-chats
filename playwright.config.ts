import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './web/tests/attachments',
  testMatch: '**/*.spec.ts',
  outputDir: './test-results/attachments',
  timeout: 30_000,
  fullyParallel: true,
  use: { baseURL: 'http://127.0.0.1:5567', headless: true, trace: 'retain-on-failure' },
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
    command: 'pnpm --filter @ap-chats/web exec vite --config tests/attachments/vite.config.mts',
    url: 'http://127.0.0.1:5567',
    reuseExistingServer: false,
  },
});
