import { randomUUID } from 'node:crypto';

import { expect, type Page, test } from '@playwright/test';

async function press(page: Page, name: string) {
  const button = page.getByRole('button', { name, exact: true });
  if (test.info().project.name === 'desktop') await button.click();
  else await button.tap();
}

test.beforeEach(async ({ page, browserName }) => {
  if (browserName === 'chromium') {
    const session = await page.context().newCDPSession(page);
    await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  }
  await page.goto(`/?session=${randomUUID()}`);
});

test('open, ask without a mention, show thinking, answer, reopen history', async ({ page }) => {
  await press(page, 'Написати StarMe');
  await expect(page.getByRole('heading', { name: 'StarMe', exact: true })).toBeVisible();
  const editor = page.getByRole('textbox', { name: 'Повідомлення', exact: true });
  await editor.fill('Допоможи з планом');
  await press(page, 'Надіслати');
  await expect(page.getByText('Думаю над відповіддю')).toBeVisible();
  await expect(
    page.getByText('Привіт! Допоможу з вашим запитом: Допоможи з планом', { exact: true }),
  ).toBeVisible();
  await expect(page.locator('article')).toHaveCount(2);
  const url = page.url();
  await page.getByRole('button', { name: 'До розмов' }).click();
  await press(page, 'Написати StarMe');
  await expect(page).toHaveURL(url);
  await expect(page.locator('article')).toHaveCount(2);
  await page.screenshot({ path: `test-results/starme/${test.info().project.name}-chat.png` });
});

test('agent failure keeps the question, retry produces one answer', async ({ page }) => {
  await press(page, 'Написати StarMe');
  await page.getByRole('textbox', { name: 'Повідомлення', exact: true }).fill('Помилка агента');
  await press(page, 'Надіслати');
  await expect(page.getByRole('alert')).toContainText('StarMe зараз не відповідає');
  await expect(page.locator('article')).toHaveCount(1);
  await press(page, 'Повторити');
  await expect(page.locator('article')).toHaveCount(2);
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('ordinary DM sends without invoking StarMe, no horizontal overflow', async ({ page }) => {
  await page.getByRole('button', { name: 'Написати Івану' }).click();
  await page.getByRole('textbox', { name: 'Повідомлення', exact: true }).fill('Привіт, Іване');
  await press(page, 'Надіслати');
  await expect(page.locator('article')).toHaveCount(1);
  await expect(page.getByText('Привіт, Іване', { exact: true })).toBeVisible();
  await page.waitForTimeout(1300);
  await expect(page.locator('article')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
