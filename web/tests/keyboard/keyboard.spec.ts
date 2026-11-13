import { expect, type Page, test } from '@playwright/test';

const position = (page: Page) =>
  page.locator('[data-composer]').evaluate((element) => element.getBoundingClientRect().bottom);
const send = (page: Page, inset: number, duration = 250) =>
  page.evaluate(({ inset, duration }) => window.keyboardFixture.send(inset, duration), {
    inset,
    duration,
  });
const nextFrame = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );

test.beforeEach(async ({ page, browserName }) => {
  if (browserName === 'chromium') {
    const client = await page.context().newCDPSession(page);
    await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  }
  await page.goto('/');
  await expect(page.getByRole('textbox')).toBeVisible();
  await expect.poll(() => page.evaluate(() => typeof window.keyboardFixture)).toBe('object');
});

test('opening and closing keeps the composer at the keyboard edge', async ({ page }) => {
  const height = page.viewportSize()!.height;
  await page.getByRole('textbox').tap();
  await page.getByRole('textbox').pressSequentially('Повідомлення');
  await send(page, 300);
  await expect.poll(() => position(page)).toBeCloseTo(height - 300, 0);
  await send(page, 0);
  await expect.poll(() => position(page)).toBeCloseTo(height, 0);
  await expect(page.getByRole('textbox')).toHaveText('Повідомлення');
});

test('closing during a rise starts from the current position', async ({ page }) => {
  const height = page.viewportSize()!.height;
  await send(page, 300, 800);
  await expect.poll(() => position(page), { intervals: [16] }).toBeLessThan(height - 90);
  const before = await position(page);
  await send(page, 0, 600);
  await nextFrame(page);
  const after = await position(page);
  expect(after - before).toBeLessThan(65);
  await expect.poll(() => position(page)).toBeCloseTo(height, 0);
});

test('a new keyboard height during a rise continues from the current position', async ({
  page,
}) => {
  const height = page.viewportSize()!.height;
  await send(page, 260, 800);
  await expect.poll(() => position(page), { intervals: [16] }).toBeLessThan(height - 60);
  const before = await position(page);
  await send(page, 300, 600);
  await nextFrame(page);
  const after = await position(page);
  expect(after - before).toBeLessThan(20);
  await expect.poll(() => position(page)).toBeCloseTo(height - 300, 0);
});

test('an early shell resize does not snap the composer to the final height', async ({ page }) => {
  const height = page.viewportSize()!.height;
  await send(page, 300, 800);
  await expect.poll(() => position(page), { intervals: [16] }).toBeLessThan(height - 60);
  const before = await position(page);
  await page.evaluate(() => window.keyboardFixture.commit(300));
  await nextFrame(page);
  const after = await position(page);
  expect(before - after).toBeLessThan(90);
  await expect.poll(() => position(page)).toBeCloseTo(height - 300, 0);
});

test('a repeated inset cannot cancel an active keyboard move', async ({ page }) => {
  const height = page.viewportSize()!.height;
  await send(page, 300, 800);
  await expect.poll(() => position(page), { intervals: [16] }).toBeLessThan(height - 60);
  const before = await position(page);
  await send(page, 300, 0);
  await nextFrame(page);
  const after = await position(page);
  expect(after - before).toBeLessThan(20);
  await expect.poll(() => position(page)).toBeCloseTo(height - 300, 0);
});

test('multiline text and an instant height adjustment keep the field above the keyboard', async ({
  page,
}) => {
  const height = page.viewportSize()!.height;
  await send(page, 260, 0);
  const editor = page.getByRole('textbox');
  await editor.fill('Перший рядок\nДругий рядок\nТретій рядок\nЧетвертий рядок');
  await send(page, 300, 0);
  await expect.poll(() => position(page)).toBeCloseTo(height - 300, 0);
  await expect(editor).toBeFocused();
  const bounds = await editor.boundingBox();
  expect(bounds!.y).toBeGreaterThan(54);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(height - 300);
});

test('switching conversation with an open keyboard still follows its closing motion', async ({
  page,
}) => {
  const height = page.viewportSize()!.height;
  await send(page, 300, 0);
  await expect.poll(() => position(page)).toBeCloseTo(height - 300, 0);
  await page.evaluate(() => window.keyboardFixture.remount());
  await nextFrame(page);
  const before = await position(page);
  await send(page, 0, 600);
  await nextFrame(page);
  expect((await position(page)) - before).toBeLessThan(65);
  await expect.poll(() => position(page)).toBeCloseTo(height, 0);
});
