import { expect, type Page, test as base } from '@playwright/test';

export { expect };

export const test = base.extend({
  page: async ({ page, browserName }, run) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    if (browserName === 'chromium') {
      const session = await page.context().newCDPSession(page);
      await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    }
    await run(page);
    expect(errors, 'The media scenario must not leave an uncaught JavaScript error').toEqual([]);
  },
});

export const videoName = 'Зустріч команди.mp4';

export async function openSampleVideo(page: Page, query = '') {
  await page.goto(`/?${query}`);
  await page
    .getByRole('button', { name: `Відкрити відео ${videoName}`, exact: true })
    .first()
    .click();
  const dialog = page.getByRole('dialog', { name: 'Перегляд медіа' });
  await expect(dialog).toBeVisible();
  return dialog;
}

export function activeVideo(page: Page) {
  return page
    .getByRole('dialog', { name: 'Перегляд медіа' })
    .locator('[role="group"]:not([aria-hidden="true"]) video');
}
