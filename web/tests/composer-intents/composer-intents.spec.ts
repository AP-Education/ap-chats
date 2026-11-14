import { expect, type Locator, type Page, test } from '@playwright/test';

async function withinScreen(page: Page, element: Locator) {
  const bounds = await element.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
}

test.beforeEach(async ({ page, browserName }) => {
  if (browserName === 'chromium') {
    const client = await page.context().newCDPSession(page);
    await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  }
  await page.goto('/');
  await expect(page.getByRole('textbox', { name: 'Повідомлення' })).toBeVisible();
});

for (const action of [
  { name: 'Відповісти', cancel: 'Скасувати відповідь' },
  { name: 'Цитувати', cancel: 'Скасувати відповідь' },
  { name: 'Запитати StarMe', cancel: 'Скасувати запит' },
]) {
  test(`${action.name}: long content fits and the original cancel button works`, async ({
    page,
  }) => {
    const editor = page.getByRole('textbox', { name: 'Повідомлення' });
    await editor.fill('Моя чернетка');
    await page.getByRole('button', { name: action.name, exact: true }).tap();
    const cancel = page.getByRole('button', { name: action.cancel, exact: true });
    await expect(cancel).toBeVisible();
    await withinScreen(page, cancel);
    await withinScreen(page, editor);
    await editor.tap();
    await cancel.tap();
    await expect(cancel).toHaveCount(0);
    await expect(editor).toHaveText('Моя чернетка');
    await withinScreen(page, editor);
  });
}

test('a cancelled quote is not attached to the next message', async ({ page }) => {
  await page.getByRole('button', { name: 'Цитувати', exact: true }).tap();
  await page.getByRole('textbox', { name: 'Повідомлення' }).fill('Самостійне повідомлення');
  const cancel = page.getByRole('button', { name: 'Скасувати відповідь', exact: true });
  await cancel.tap();
  await expect(cancel).toHaveCount(0);
  await page.getByRole('button', { name: 'Надіслати', exact: true }).tap();
  const output = page.getByLabel('Надіслані повідомлення');
  await expect(output).toContainText('Самостійне повідомлення');
  const sent = JSON.parse((await output.textContent())!);
  expect(sent).toHaveLength(1);
  expect(sent[0].replyToMessageId).toBeUndefined();
  expect(sent[0].quoteText).toBeUndefined();
});

test('a multiline draft can cancel quotes above an open keyboard repeatedly', async ({ page }) => {
  await page.evaluate(() =>
    window.ApAppNative?.onMessage?.({ type: 'keyboard/inset', inset: 280, duration: 0 }),
  );
  const editor = page.getByRole('textbox', { name: 'Повідомлення' });
  const draft = 'Перший рядок\nДругий рядок\nТретій рядок';
  await editor.fill(draft);
  for (const action of ['Цитувати', 'Відповісти']) {
    await page.getByRole('button', { name: action, exact: true }).tap();
    const cancel = page.getByRole('button', { name: 'Скасувати відповідь', exact: true });
    await withinScreen(page, cancel);
    const bounds = await cancel.boundingBox();
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(page.viewportSize()!.height - 280);
    await cancel.tap();
    await expect(cancel).toHaveCount(0);
    await expect(editor).toHaveText(draft, { useInnerText: true });
  }
});

test('holding send opens scheduling with the keyboard dismissed', async ({ page }) => {
  await page.getByRole('textbox', { name: 'Повідомлення' }).fill('Пізніше');
  // The open sheet hides the page behind it from the accessibility tree.
  const editor = page.locator('[role="textbox"][aria-label="Повідомлення"]');
  const send = page.locator('button[aria-label="Надіслати"]');
  await expect(editor).toBeFocused();
  // A finger's hold: iOS keeps the keyboard up, over the sheet, while the composer has focus.
  await send.dispatchEvent('pointerdown', { pointerType: 'touch', isPrimary: true });
  await expect(page.getByRole('dialog', { name: 'Запланувати повідомлення' })).toBeVisible();
  await send.dispatchEvent('pointerup', { pointerType: 'touch', isPrimary: true });
  await expect(editor).not.toBeFocused();
  await expect(editor).toHaveText('Пізніше');
});
