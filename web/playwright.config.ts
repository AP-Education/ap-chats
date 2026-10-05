import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  reporter: 'list',
  use: { headless: true },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    ...(process.env.TEST_WEBKIT
      ? [{ name: 'webkit', use: { browserName: 'webkit' as const } }]
      : []),
  ],
});
