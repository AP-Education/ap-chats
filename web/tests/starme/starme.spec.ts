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

for (const kind of ['dm', 'group'] as const) {
  test(`${kind}: private conversation survives reload and Make mine replaces the answer for every participant`, async ({
    page,
  }) => {
    if (kind === 'group') {
      await press(page, 'До розмов');
      await press(page, 'Відкрити групу');
    }
    const session = await page.evaluate(() => sessionStorage.getItem('starme-qa-session'));
    const channelId = new URL(page.url()).pathname.split('/direct/')[1]!;
    const peers = [];
    for (const role of kind === 'group' ? ['peer', 'manager'] : ['peer']) {
      const peer = await page.context().newPage();
      await peer.goto(`/direct/${channelId}?session=${session}_${role}`);
      await expect(peer.getByRole('textbox', { name: 'Повідомлення', exact: true })).toBeVisible();
      peers.push(peer);
    }
    const editor = page.getByRole('textbox', { name: 'Повідомлення', exact: true });
    await editor.fill('Повідомлення для всіх');
    await press(page, 'Надіслати');
    for (const peer of peers) await expect(peer.locator('article')).toHaveCount(1);
    await mention(page, 'Секретний план');
    await expect(page.getByText('Думаю над відповіддю')).toBeVisible();
    for (const peer of peers) await expect(peer.getByText('Думаю над відповіддю')).toHaveCount(0);
    await expect(page.locator('article')).toHaveCount(3);
    await expect(
      page.getByText('Приватно зі StarMe · Лише для вас', { exact: true }),
    ).toBeVisible();
    const privateIds = await page
      .locator('[data-private="true"]')
      .evaluateAll((rows) => rows.map((row) => row.getAttribute('data-message-id')!));
    const answer = page.locator('[data-assistant-answer="true"]').first();
    const answerId = await answer.getAttribute('data-message-id');
    for (const peer of peers) {
      await expect(peer.locator('article')).toHaveCount(1);
      const peerSession = await peer.evaluate(() => sessionStorage.getItem('starme-qa-session'));
      const options = {
        headers: { authorization: `Bearer fixture-only:${peerSession}` },
        timeout: 10_000,
      };
      const state = await (await peer.request.get('/api/qa/session', options)).json();
      const root = `/api/workspaces/${state.workspaceId}/channels/${channelId}/messages`;
      const statuses = await Promise.all(
        privateIds.map(async (id) => (await peer.request.get(`${root}/${id}`, options)).status()),
      );
      const history = await (await peer.request.get(`${root}/window`, options)).text();
      const events = await (await peer.request.get('/api/qa/events', options)).text();
      const result = { statuses, history, events };
      expect(result.statuses).toEqual([404, 404]);
      expect(result.history).not.toContain('Секретний план');
      for (const id of privateIds) expect(result.events).not.toContain(id);
    }
    await editor.fill('Приватне продовження');
    await page.reload();
    await expect(editor).toHaveText('Приватне продовження');
    const sent = page.waitForRequest(
      (request) => request.method() === 'POST' && request.url().endsWith('/messages'),
    );
    await press(page, 'Надіслати');
    expect((await sent).postDataJSON().assistant).toBe(true);
    await expect(page.locator('article')).toHaveCount(5);
    for (const peer of peers) await expect(peer.locator('article')).toHaveCount(1);
    await openActions(page, page.locator(`[data-message-id="${answerId}"]`));
    await expect(messageAction(page, 'Переслати')).toHaveCount(0);
    await messageAction(page, 'Зробити моїм').click();
    await expect(page.locator(`[data-message-id="${answerId}"]`)).toHaveAttribute(
      'data-private',
      'false',
    );
    await expect(page.locator('article')).toHaveCount(5);
    const myAuthor = await page
      .locator(`[data-message-id="${answerId}"]`)
      .getAttribute('data-author');
    for (const peer of peers) {
      await expect(peer.locator('article')).toHaveCount(2);
      await expect(peer.locator(`[data-message-id="${answerId}"]`)).toHaveAttribute(
        'data-author',
        myAuthor!,
      );
      await expect(peer.locator(`[data-message-id="${privateIds[0]}"]`)).toHaveCount(0);
    }
    await press(page, 'Повернутися до чату');
    await editor.fill('Знову для всіх');
    await press(page, 'Надіслати');
    for (const peer of peers) await expect(peer.locator('article')).toHaveCount(3);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `test-results/starme/${test.info().project.name}-${kind}-private.png`,
    });
    for (const peer of peers) await peer.close();
  });
}
