import { readFile } from 'node:fs/promises';

import { expect, test } from './media-test';

const name = 'Відео команди.mp4';
const video = await readFile(new URL('./public/media/sample.mp4', import.meta.url));

test('sending while video processing continues becomes one playable message with the original caption', async ({
  page,
}) => {
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/uploads/*/complete', async (route) => {
    await held;
    await route.continue();
  });
  const posts: Record<string, unknown>[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/messages'))
      posts.push(request.postDataJSON());
  });
  await page.goto('/?chat');
  await page
    .locator('input[type=file]')
    .setInputFiles({ name, mimeType: 'video/mp4', buffer: video });
  await expect(page.getByRole('status').filter({ hasText: 'Обробка файлу' })).toBeVisible();
  await page
    .getByRole('textbox', { name: 'Повідомлення', exact: true })
    .fill('Запис нашої зустрічі');
  await page.getByRole('button', { name: 'Надіслати', exact: true }).click();
  try {
    await expect(
      page.getByRole('log').getByText('Запис нашої зустрічі', { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('log').getByRole('article', { name, exact: true })).toBeVisible();
    expect(posts).toEqual([]);
  } finally {
    release();
  }
  const poster = page.getByRole('log').getByRole('img', { name: `Кадр відео ${name}` });
  await expect(poster).toBeVisible();
  await expect.poll(() => posts.length).toBe(1);
  expect(posts[0]!.attachments).toEqual([{ id: expect.any(String) }]);
  expect(posts[0]!.markdown).toBe('Запис нашої зустрічі');
  await expect(
    page.getByRole('log').getByText('Запис нашої зустрічі', { exact: true }),
  ).toHaveCount(1);
  await page.getByRole('button', { name: `Відкрити відео ${name}`, exact: true }).click();
  await expect
    .poll(() => page.locator('video').evaluate((element: HTMLVideoElement) => element.readyState))
    .toBeGreaterThanOrEqual(2);
  await page.getByRole('button', { name: 'Закрити', exact: true }).click();
  await expect(poster).toBeVisible();
});

test('removing an uploading video cancels its reservation without losing the typed caption', async ({
  page,
}) => {
  let release!: () => void;
  let entered!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const sending = new Promise<void>((resolve) => {
    entered = resolve;
  });
  await page.route('**/fixture-storage/**', async (route) => {
    entered();
    await held;
    await route.fulfill({ status: 200 }).catch(() => undefined);
  });
  const cancelled: string[] = [];
  const posts: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'DELETE' && request.url().includes('/uploads/'))
      cancelled.push(request.url());
    if (request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/messages'))
      posts.push(request.url());
  });
  await page.goto('/?chat');
  const editor = page.getByRole('textbox', { name: 'Повідомлення', exact: true });
  await editor.fill('Підпис залишиться у чернетці');
  await page
    .locator('input[type=file]')
    .setInputFiles({ name, mimeType: 'video/mp4', buffer: video });
  try {
    await sending;
    await page.getByRole('button', { name: `Прибрати ${name}`, exact: true }).click();
    await expect(page.getByRole('region', { name: 'Вкладення до повідомлення' })).toHaveCount(0);
    await expect.poll(() => cancelled.length).toBe(1);
    await expect(editor).toHaveText('Підпис залишиться у чернетці');
    expect(posts).toEqual([]);
  } finally {
    release();
  }
});

test('a failed video in a pending message retries its upload and is posted exactly once', async ({
  page,
}) => {
  let release!: () => void;
  let entered!: () => void;
  let failing = true;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const sending = new Promise<void>((resolve) => {
    entered = resolve;
  });
  await page.route('**/fixture-storage/**', async (route) => {
    entered();
    await held;
    await route.fulfill({ status: failing ? 503 : 200 });
  });
  let posts = 0;
  page.on('request', (request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/messages'))
      posts++;
  });
  await page.goto('/?chat');
  await page
    .locator('input[type=file]')
    .setInputFiles({ name, mimeType: 'video/mp4', buffer: video });
  try {
    await sending;
    await page
      .getByRole('textbox', { name: 'Повідомлення', exact: true })
      .fill('Спробую надіслати запис');
    await page.getByRole('button', { name: 'Надіслати', exact: true }).click();
  } finally {
    release();
  }
  const timeline = page.getByRole('log');
  await expect(timeline.getByRole('img', { name: 'Не надіслано', exact: true })).toBeVisible();
  expect(posts).toBe(0);
  failing = false;
  await timeline.getByRole('button', { name: 'Повторити', exact: true }).click();
  await expect(timeline.getByRole('img', { name: `Кадр відео ${name}` })).toBeVisible();
  await expect.poll(() => posts).toBe(1);
  await expect(timeline.getByText('Спробую надіслати запис', { exact: true })).toHaveCount(1);
  await expect(timeline.getByRole('img', { name: 'Не надіслано', exact: true })).toHaveCount(0);
});
