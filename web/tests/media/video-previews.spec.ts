import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  const client = await page.context().newCDPSession(page);
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
});

test('a poster and duration appear without fetching or playing the original', async ({
  page,
}, info) => {
  const videos: string[] = [];
  page.on('request', (req) => {
    if (req.url().endsWith('.mp4')) videos.push(req.url());
  });
  await page.goto('/');
  const image = page.getByRole('img', { name: 'Кадр відео Зустріч команди.mp4' });
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(320);
  await expect(page.getByLabel('Тривалість 0:02')).toBeVisible();
  expect(videos).toEqual([]);
  await expect(page.locator('video')).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('poster.png') });
  await page.getByRole('button', { name: 'Відкрити відео Зустріч команди.mp4' }).click();
  await expect(page.getByRole('dialog', { name: 'Перегляд медіа' })).toBeVisible();
  await expect(page.locator('video')).toBeVisible();
  await expect
    .poll(() => page.locator('video').evaluate((el: HTMLVideoElement) => el.readyState))
    .toBeGreaterThanOrEqual(2);
  expect(videos.length).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Закрити', exact: true }).click();
  await expect(page.locator('video')).toHaveCount(0);
});

test('a failed poster keeps keyboard playback and download available', async ({ page }) => {
  await page.route('**/media/*.webp', (route) => route.fulfill({ status: 404 }));
  await page.goto('/');
  await expect(page.getByText('Превʼю недоступне')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Завантажити Зустріч команди.mp4' })).toBeEnabled();
  const play = page.getByRole('button', { name: 'Відкрити відео Зустріч команди.mp4' });
  await play.focus();
  await play.press('Enter');
  await expect(page.locator('video')).toBeVisible();
});

test('a poster is not fetched while offscreen and a disabled attachment cannot open it', async ({
  page,
}) => {
  const posters: string[] = [];
  page.on('request', (req) => {
    if (req.url().endsWith('.webp')) posters.push(req.url());
  });
  await page.goto('/?offscreen');
  await expect(page.getByRole('heading')).toBeVisible();
  expect(posters).toEqual([]);
  await page
    .getByRole('button', { name: 'Відкрити відео Зустріч команди.mp4' })
    .scrollIntoViewIfNeeded();
  await expect.poll(() => posters.length).toBe(1);
  await page.goto('/?unavailable');
  await expect(
    page.getByRole('button', { name: 'Відкрити відео Зустріч команди.mp4' }),
  ).toBeDisabled();
});

test('portrait posters stay within a narrow viewport and old videos keep a playable file card', async ({
  page,
}, info) => {
  await page.goto('/?portrait');
  const poster = page.getByRole('img', { name: 'Кадр відео Зустріч команди.mp4' });
  await expect(poster).toBeVisible();
  await expect.poll(() => poster.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(180);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('portrait.png') });
  await page.goto('/?legacy');
  await expect(page.getByRole('img', { name: 'Кадр відео Зустріч команди.mp4' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Відтворити Зустріч команди.mp4' }).click();
  await expect(page.locator('video')).toBeVisible();
});

test('an unsupported codec gives an actionable download instead of a blank player', async ({
  page,
}) => {
  await page.route('**/media/*.mp4', (route) =>
    route.fulfill({ contentType: 'video/mp4', body: 'corrupt' }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Відкрити відео Зустріч команди.mp4' }).click();
  await expect(page.getByText('Не вдалося відтворити відео')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Завантажити відео', exact: true })).toBeEnabled();
});
