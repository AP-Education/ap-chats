import { randomUUID } from 'node:crypto';

import { expect, type Locator, type Page, test } from '@playwright/test';

async function press(page: Page, name: string) {
  const button = page.getByRole('button', { name, exact: true });
  if (test.info().project.name === 'desktop') await button.click();
  else await button.tap();
}

async function mention(page: Page, text: string) {
  const editor = page.getByRole('textbox', { name: 'Повідомлення', exact: true });
  await editor.fill('@StarMe');
  const option = page.getByRole('option', { name: /StarMe/u });
  await expect(option).toBeVisible();
  await option.click();
  await editor.pressSequentially(` ${text}`);
  await press(page, 'Надіслати');
}

function messageAction(page: Page, name: string) {
  return page
    .getByRole('menuitem', { name, exact: true })
    .or(page.getByRole('button', { name, exact: true }));
}

async function openActions(page: Page, row: Locator) {
  if (test.info().project.name === 'phone' || test.info().project.name === 'narrow') {
    const box = (await row.boundingBox())!;
    const session = await page.context().newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }],
    });
    await page.waitForTimeout(700);
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } else {
    await row.click({ button: 'right' });
  }
  await expect(messageAction(page, 'Запитати StarMe')).toBeVisible();
}

test.beforeEach(async ({ page, browserName }) => {
  if (browserName === 'chromium') {
    const session = await page.context().newCDPSession(page);
    await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  }
  await page.goto(`/?session=${randomUUID()}`);
  await press(page, 'Написати Івану');
  await expect(page.getByRole('heading', { name: 'Іван Петренко', exact: true })).toBeVisible();
});

test('a human DM stays quiet until StarMe is mentioned; either message action can continue its answer', async ({
  page,
}) => {
  const editor = page.getByRole('textbox', { name: 'Повідомлення', exact: true });
  await editor.fill('Привіт, Іване');
  await press(page, 'Надіслати');
  await expect(page.locator('article')).toHaveCount(1);
  await page.waitForTimeout(1300);
  await expect(page.locator('article')).toHaveCount(1);
  await mention(page, 'Допоможи з планом');
  await expect(page.getByText('Думаю над відповіддю')).toBeVisible();
  await expect(page.locator('article')).toHaveCount(3);
  const answer = page.locator('[data-message-id]').filter({ hasText: 'Привіт! Допоможу' }).last();
  await openActions(page, answer);
  await messageAction(page, 'Відповісти').click();
  await editor.fill('А детальніше?');
  await press(page, 'Надіслати');
  await expect(page.locator('article')).toHaveCount(5);
  const url = page.url();
  await press(page, 'До розмов');
  await press(page, 'Написати Івану');
  await expect(page).toHaveURL(url);
  await expect(page.locator('article')).toHaveCount(5);
  await page.reload();
  await expect(page.locator('article')).toHaveCount(5);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/starme/${test.info().project.name}-human-dm.png` });
});

test('agent failure keeps the human DM question and retry produces one answer', async ({
  page,
}) => {
  await mention(page, 'Помилка агента');
  await expect(page.getByRole('alert')).toContainText('StarMe зараз не відповідає');
  await expect(page.locator('article')).toHaveCount(1);
  await press(page, 'Повторити');
  await expect(page.locator('article')).toHaveCount(2);
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('Ask StarMe on a human message keeps its selected context in the same DM', async ({
  page,
}) => {
  await page
    .getByRole('textbox', { name: 'Повідомлення', exact: true })
    .fill('Наші терміни на тиждень');
  await press(page, 'Надіслати');
  const row = page.locator('[data-message-id]').first();
  await expect(row).toBeVisible();
  const id = await row.getAttribute('data-message-id');
  await openActions(page, row);
  await messageAction(page, 'Запитати StarMe').click();
  const posted = page.waitForRequest(
    (request) => request.method() === 'POST' && request.url().endsWith('/messages'),
  );
  await press(page, 'Надіслати');
  const request = await posted;
  expect(request.postDataJSON().contextMessageIds).toEqual([id]);
  await expect(page.locator('article')).toHaveCount(3);
  await expect(page.getByRole('heading', { name: 'Іван Петренко' })).toBeVisible();
});

test('a batch selection can ask StarMe about both messages inside the human DM', async ({
  page,
}) => {
  const editor = page.getByRole('textbox', { name: 'Повідомлення', exact: true });
  for (const text of ['Бюджет', 'Терміни']) {
    await editor.fill(text);
    await press(page, 'Надіслати');
  }
  await expect(page.locator('article')).toHaveCount(2);
  const rows = page.locator('[data-message-id]');
  const ids = await rows.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute('data-message-id')),
  );
  await openActions(page, rows.first());
  await messageAction(page, 'Вибрати').click();
  await openActions(page, rows.last());
  await messageAction(page, 'Вибрати').click();
  await expect(page.getByRole('toolbar', { name: 'Вибрані повідомлення' })).toContainText(
    'Вибрано: 2',
  );
  await press(page, 'Запитати');
  await editor.fill('Підсумуй');
  const posted = page.waitForRequest(
    (request) => request.method() === 'POST' && request.url().endsWith('/messages'),
  );
  await press(page, 'Надіслати');
  expect((await posted).postDataJSON().contextMessageIds).toEqual(ids);
  await expect(page.locator('article')).toHaveCount(4);
});
