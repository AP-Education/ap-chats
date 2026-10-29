import { expect, openSampleVideo, test, videoName } from './media-test';

test('unavailable attachments cannot request a poster, open playback or download', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/url?')) requests.push(request.url());
  });
  await page.goto('/?unavailable');
  await expect(
    page.getByRole('button', { name: `Відкрити відео ${videoName}`, exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole('button', { name: `Завантажити ${videoName}`, exact: true }),
  ).toBeDisabled();
  expect(requests).toEqual([]);
});

test('a denied poster URL preserves the distinct play and download actions', async ({ page }) => {
  await page.route('**/url?variant=thumbnail', (route) =>
    route.fulfill({ status: 403, json: { message: 'No access' } }),
  );
  await page.goto('/');
  await expect(page.getByText('Превʼю недоступне')).toBeVisible();
  await expect(
    page.getByRole('button', { name: `Завантажити ${videoName}`, exact: true }),
  ).toBeEnabled();
  await page.getByRole('button', { name: `Відкрити відео ${videoName}`, exact: true }).click();
  await expect
    .poll(() => page.locator('video').evaluate((video: HTMLVideoElement) => video.readyState))
    .toBeGreaterThanOrEqual(2);
});

test('download reports denied access, blocks duplicate presses while pending and can be retried', async ({
  page,
}) => {
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let denied = true;
  let requests = 0;
  await page.route('**/url?variant=download', async (route) => {
    requests++;
    await held;
    await route.fulfill(
      denied
        ? { status: 403, json: { message: 'Access changed' } }
        : { json: { url: '/media/sample.mp4' } },
    );
  });
  await page.goto('/');
  const download = page.getByRole('button', { name: `Завантажити ${videoName}`, exact: true });
  await download.click();
  try {
    await expect(download).toBeDisabled();
    await expect(download).toHaveAttribute('aria-busy', 'true');
    await download.evaluate((button: HTMLButtonElement) => button.click());
    expect(requests).toBe(1);
  } finally {
    release();
  }
  await expect(
    page.getByText('Не вдалося завантажити файл. Можливо, доступ до повідомлення змінився.'),
  ).toBeVisible();
  await expect(download).toBeEnabled();
  denied = false;
  const saved = page.waitForEvent('download');
  await download.click();
  expect((await saved).suggestedFilename()).toBe(videoName);
  expect(requests).toBe(2);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('an expired playback URL is refreshed on retry instead of replaying the dead address', async ({
  page,
}) => {
  let requests = 0;
  await page.route('**/url?variant=preview', (route) =>
    route.fulfill({ json: { url: ++requests === 1 ? '/media/expired.mp4' : '/media/sample.mp4' } }),
  );
  await page.route('**/media/expired.mp4', (route) => route.fulfill({ status: 403 }));
  const dialog = await openSampleVideo(page);
  await expect(dialog.getByText('Не вдалося відтворити відео')).toBeVisible();
  await dialog.getByRole('button', { name: 'Спробувати ще', exact: true }).click();
  await expect
    .poll(() => page.locator('video').evaluate((video: HTMLVideoElement) => video.readyState))
    .toBeGreaterThanOrEqual(2);
  await expect(page.locator('video')).toHaveAttribute('src', '/media/sample.mp4');
  expect(requests).toBe(2);
});

test('a denied signed-URL request remains actionable through a failed retry and recovery', async ({
  page,
}) => {
  let denied = true;
  await page.route('**/url?variant=preview', (route) =>
    route.fulfill(
      denied
        ? { status: 403, json: { message: 'No access' } }
        : { json: { url: '/media/sample.mp4' } },
    ),
  );
  const dialog = await openSampleVideo(page);
  await expect(dialog.getByText('Не вдалося відтворити відео')).toBeVisible();
  const retry = dialog.getByRole('button', { name: 'Спробувати ще', exact: true });
  await retry.click();
  await expect(retry).toBeEnabled();
  await expect(dialog.getByText('Не вдалося відтворити відео')).toBeVisible();
  denied = false;
  await retry.click();
  await expect
    .poll(() => page.locator('video').evaluate((video: HTMLVideoElement) => video.readyState))
    .toBeGreaterThanOrEqual(2);
});
