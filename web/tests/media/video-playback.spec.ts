import { activeVideo, expect, openSampleVideo, test, videoName } from './media-test';

test('the actual video plays, pauses and resumes through its native keyboard controls', async ({
  page,
}) => {
  const dialog = await openSampleVideo(page, 'long');
  const video = activeVideo(page);
  await expect
    .poll(() => video.evaluate((element: HTMLVideoElement) => element.readyState))
    .toBeGreaterThanOrEqual(2);
  const manual = dialog.getByRole('button', { name: 'Відтворити відео', exact: true });
  if (await manual.isVisible()) await manual.click();
  await expect
    .poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime))
    .toBeGreaterThan(0);
  await video.focus();
  await video.press('Space');
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
  const stopped = await video.evaluate((element: HTMLVideoElement) => element.currentTime);
  await video.press('Space');
  await expect
    .poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime))
    .toBeGreaterThan(stopped);
});

test('seeking a focused video does not turn the gallery to another clip', async ({ page }) => {
  const dialog = await openSampleVideo(page, 'long&multiple');
  const video = activeVideo(page);
  await expect
    .poll(() => video.evaluate((element: HTMLVideoElement) => element.readyState))
    .toBeGreaterThanOrEqual(2);
  await expect(dialog).toBeFocused();
  const before = await video.evaluate((element: HTMLVideoElement) => element.currentTime);
  await video.focus();
  await video.press('ArrowRight');
  await expect(dialog.getByText('1 з 2', { exact: true })).toBeVisible();
  await expect
    .poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime))
    .toBeGreaterThan(before + 1);
});

test('closing the viewer stops the video object as well as removing it from the conversation', async ({
  page,
}) => {
  await openSampleVideo(page, 'long');
  const video = activeVideo(page);
  await expect
    .poll(() => video.evaluate((element: HTMLVideoElement) => element.readyState))
    .toBeGreaterThanOrEqual(2);
  await video.evaluate((element) => {
    (window as unknown as { closedVideo: HTMLVideoElement }).closedVideo =
      element as HTMLVideoElement;
  });
  await page.getByRole('button', { name: 'Закрити', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(
    await page.evaluate(
      () => (window as unknown as { closedVideo: HTMLVideoElement }).closedVideo.paused,
    ),
  ).toBe(true);
  await expect(
    page.getByRole('button', { name: `Відкрити відео ${videoName}`, exact: true }),
  ).toBeVisible();
});

test('Escape closes playback and returns keyboard focus to the message', async ({ page }) => {
  const dialog = await openSampleVideo(page, 'chat&long');
  await expect(dialog).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: `Відкрити відео ${videoName}`, exact: true }),
  ).toBeFocused();
});

test('native fullscreen can end without discarding the surrounding media viewer', async ({
  page,
}) => {
  const dialog = await openSampleVideo(page, 'long');
  const video = activeVideo(page);
  await expect
    .poll(() => video.evaluate((element: HTMLVideoElement) => element.readyState))
    .toBeGreaterThanOrEqual(2);
  const supported = await page.evaluate(() => document.fullscreenEnabled);
  test.skip(
    !supported,
    'This browser exposes system video fullscreen outside the document Fullscreen API.',
  );
  await video.evaluate((element: HTMLVideoElement) => element.requestFullscreen());
  await expect.poll(() => page.evaluate(() => document.fullscreenElement?.tagName)).toBe('VIDEO');
  await page.evaluate(() => document.exitFullscreen());
  await expect.poll(() => page.evaluate(() => document.fullscreenElement)).toBe(null);
  await expect(dialog).toBeVisible();
  await expect(video).toBeVisible();
});

test('leaving a conversation while the gallery opens cleans up its modal and media', async ({
  page,
}) => {
  await openSampleVideo(page, 'chat&long');
  await page.evaluate(() => window.dispatchEvent(new Event('fixture:leave')));
  await expect(page.getByText('Тестовий чат закрито')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('video')).toHaveCount(0);
});

test('leaving before the gallery module arrives cannot open a late modal', async ({ page }) => {
  let release!: () => void;
  let entered!: () => void;
  let moduleUrl = '';
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const loading = new Promise<void>((resolve) => {
    entered = resolve;
  });
  await page.route('**/media-gallery-*.js', async (route) => {
    moduleUrl = route.request().url();
    entered();
    await held;
    await route.continue();
  });
  await page.goto('/?chat');
  await page.getByRole('button', { name: `Відкрити відео ${videoName}`, exact: true }).click();
  try {
    await loading;
    await page.evaluate(() => window.dispatchEvent(new Event('fixture:leave')));
  } finally {
    release();
  }
  await page.evaluate(async (url) => {
    await import(url);
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  }, moduleUrl);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('video')).toHaveCount(0);
});

test('a gallery bundle failure reports the problem without breaking the surrounding chat', async ({
  page,
}) => {
  await page.route('**/media-gallery-*.js', (route) => route.fulfill({ status: 503, body: '' }));
  await page.goto('/?chat');
  await page.getByRole('button', { name: `Відкрити відео ${videoName}`, exact: true }).click();
  await expect(
    page.getByText('Не вдалося відкрити медіа. Перевірте з’єднання та спробуйте ще раз.'),
  ).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page
    .getByRole('textbox', { name: 'Повідомлення', exact: true })
    .fill('Чат продовжує працювати');
  await page.getByRole('button', { name: 'Надіслати', exact: true }).click();
  await expect(
    page.getByRole('log').getByText('Чат продовжує працювати', { exact: true }),
  ).toBeVisible();
});

test('portrait playback stays clear of a long caption when the phone rotates', async ({ page }) => {
  const dialog = await openSampleVideo(page, 'chat&portrait&longcaption');
  await expect(dialog).toBeFocused();
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await expect
      .poll(async () => {
        const frame = await activeVideo(page).boundingBox();
        const header = await dialog.locator('header').boundingBox();
        const footer = await dialog.locator('footer').boundingBox();
        return Boolean(
          frame &&
          header &&
          footer &&
          frame.y >= header.y + header.height &&
          frame.y + frame.height <= footer.y + 1,
        );
      })
      .toBe(true);
  }
});

test('multiple videos show the timestamp once, on the last poster', async ({ page }) => {
  await page.goto('/?chat&multiple&nocaption');
  const row = page.locator('#message-message');
  await expect(row.locator('[data-media-key]')).toHaveCount(2);
  await expect(row.locator('time')).toHaveCount(1);
  await expect(row.locator('[data-media-key]').first().locator('time')).toHaveCount(0);
  await expect(row.locator('[data-media-key]').last().locator('time')).toBeVisible();
});
