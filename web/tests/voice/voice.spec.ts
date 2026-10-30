import { writeFile } from 'node:fs/promises';

import { expect, type Page, test } from '@playwright/test';

import { inspectVoice } from '../../../src/components/social/attachments/voice-inspection';

test.beforeEach(async ({ page, browserName, context }) => {
  await context.grantPermissions(['microphone']);
  if (browserName === 'chromium') {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  }
  await page.addInitScript(() => {
    const send = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function (body) {
      if (body instanceof Blob) {
        void body.arrayBuffer().then((buffer) => {
          (window as unknown as { fixtureUploadBytes: number[] }).fixtureUploadBytes = Array.from(
            new Uint8Array(buffer),
          );
          send.call(this, body);
        });
      } else send.call(this, body);
    };
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    void original;
    let active = 0;
    Object.defineProperty(window, 'testActiveMicrophones', { get: () => active });
    const devices = navigator.mediaDevices;
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: devices });
    devices.getUserMedia = async () => {
      const context = new AudioContext();
      await context.resume();
      const oscillator = context.createOscillator();
      const output = context.createMediaStreamDestination();
      oscillator.frequency.value = 440;
      oscillator.connect(output);
      oscillator.start();
      active++;
      const track = output.stream.getAudioTracks()[0]!;
      const stop = track.stop.bind(track);
      let stopped = false;
      track.stop = () => {
        if (stopped) return;
        stopped = true;
        active--;
        stop();
        oscillator.stop();
        void context.close();
      };
      return output.stream;
    };
  });
});

async function backend(page: Page, failFirst = false) {
  const uploads = new Map<string, { name: string; bytes: Buffer; attachment?: object }>();
  const posts: Record<string, unknown>[] = [];
  let completionAttempts = 0;
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.endsWith('/uploads/policy'))
      return route.fulfill({
        json: {
          maxFiles: 10,
          maxFileBytes: 1_000_000_000,
          maxMessageBytes: 1_000_000_000,
          partBytes: 16 * 1024 * 1024,
        },
      });
    if (url.pathname.endsWith('/uploads')) {
      const body = request.postDataJSON();
      const id = crypto.randomUUID();
      uploads.set(id, { name: body.name, bytes: Buffer.alloc(0) });
      return route.fulfill({
        status: 201,
        json: {
          id,
          partBytes: 16 * 1024 * 1024,
          expiresAt: new Date(Date.now() + 3600_000).toISOString(),
        },
      });
    }
    if (url.pathname.endsWith('/part')) {
      const id = url.pathname.split('/').at(-2)!;
      return route.fulfill({ json: { url: `http://127.0.0.1:5571/api/test-part/${id}` } });
    }
    if (url.pathname.includes('/test-part/')) {
      const upload = uploads.get(url.pathname.split('/').at(-1)!)!;
      upload.bytes =
        request.postDataBuffer() ??
        Buffer.from(
          await page.evaluate(
            () => (window as unknown as { fixtureUploadBytes: number[] }).fixtureUploadBytes,
          ),
        );
      return route.fulfill({ status: 200, body: '' });
    }
    if (url.pathname.endsWith('/complete')) {
      completionAttempts++;
      if (failFirst && completionAttempts === 1)
        return route.fulfill({ status: 400, json: { message: 'Test interruption' } });
      const id = url.pathname.split('/').at(-2)!;
      const upload = uploads.get(id)!;
      expect(request.postDataJSON()).toEqual({ kind: 'voice' });
      let media;
      try {
        media = await inspectVoice(upload.bytes);
      } catch (error) {
        await writeFile(test.info().outputPath('recording.bin'), upload.bytes);
        throw error;
      }
      upload.attachment = {
        id,
        name: upload.name,
        size: upload.bytes.length,
        description: null,
        ...media,
      };
      return route.fulfill({ json: upload.attachment });
    }
    if (url.pathname.endsWith('/messages') && request.method() === 'POST') {
      const body = request.postDataJSON();
      posts.push(body);
      const attachments = body.attachments.map(
        (ref: { id: string }) => uploads.get(ref.id)!.attachment,
      );
      return route.fulfill({
        status: 201,
        json: {
          ...body,
          id: crypto.randomUUID(),
          seq: String(posts.length),
          createdAt: new Date().toISOString(),
          attachments,
          contentVersion: 1,
          revision: 1,
          markdown: '',
          authorMemberId: 'fixture',
        },
      });
    }
    if (url.pathname.endsWith('/url')) {
      const id = url.pathname.split('/uploads/')[1]!.split('/')[0]!;
      return route.fulfill({ json: { url: `http://127.0.0.1:5571/api/test-audio/${id}` } });
    }
    if (url.pathname.includes('/test-audio/')) {
      const upload = uploads.get(url.pathname.split('/').at(-1)!)!;
      return route.fulfill({ status: 200, contentType: 'audio/mp4', body: upload.bytes });
    }
    return route.fulfill({ json: [] });
  });
  return { uploads, posts };
}

async function start(page: Page) {
  await page.getByRole('button', { name: 'Записати голосове повідомлення' }).click();
  await page.getByRole('button', { name: 'Почати запис', exact: true }).click();
  await expect(page.getByText('Триває запис', { exact: true })).toBeVisible();
  await expect.poll(() => page.getByLabel('Тривалість запису').textContent()).not.toBe('0:00');
}

test('record, pause, preview and send a real audio file through the composer, upload queue and outbox', async ({
  page,
}) => {
  const data = await backend(page);
  await page.goto('/');
  await start(page);
  await page.getByRole('button', { name: 'Пауза запису', exact: true }).click();
  await expect(page.getByText('Запис на паузі')).toBeVisible();
  await page.getByRole('button', { name: 'Продовжити запис', exact: true }).click();
  await page.getByRole('button', { name: 'Завершити запис', exact: true }).click();
  await expect(page.getByLabel('Прослухати запис')).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { testActiveMicrophones: number }).testActiveMicrophones,
      ),
    )
    .toBe(0);
  expect(data.posts).toHaveLength(0);
  await page.getByRole('button', { name: 'Надіслати голосове', exact: true }).click();
  await expect(page.getByLabel('Голосове повідомлення', { exact: true })).toBeVisible();
  expect(data.posts).toHaveLength(1);
  expect(data.uploads.size).toBe(1);
  await page.getByRole('button', { name: 'Відтворити голосове', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Швидкість відтворення' })).toHaveText('1×');
  await page.getByRole('button', { name: 'Швидкість відтворення' }).click();
  await expect(page.getByRole('button', { name: 'Швидкість відтворення' })).toHaveText('1.5×');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('cancel releases the microphone without uploading or sending', async ({ page }) => {
  const data = await backend(page);
  await page.goto('/');
  await start(page);
  await page.getByRole('button', { name: 'Скасувати запис', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { testActiveMicrophones: number }).testActiveMicrophones,
      ),
    )
    .toBe(0);
  expect(data.posts).toHaveLength(0);
  expect(data.uploads.size).toBe(0);
});

test('changing the conversation or account closes the recording and cannot send it elsewhere', async ({
  page,
}) => {
  const data = await backend(page);
  await page.goto('/');
  await start(page);
  await page.evaluate(() => window.dispatchEvent(new Event('fixture:change-chat')));
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { testActiveMicrophones: number }).testActiveMicrophones,
      ),
    )
    .toBe(0);
  await expect(page.getByRole('heading', { name: 'Особистий чат' })).toBeVisible();
  await page.getByRole('button', { name: 'Записати голосове повідомлення' }).click();
  await expect(page.getByLabel('Тривалість запису')).toHaveText('0:00');
  expect(data.posts).toHaveLength(0);
});

test('denied microphone permission has a readable error and never queues a file', async ({
  page,
}) => {
  const data = await backend(page);
  await page.goto('/');
  await page.evaluate(() => {
    const devices = navigator.mediaDevices;
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: devices });
    devices.getUserMedia = async () => {
      throw new DOMException('Denied', 'NotAllowedError');
    };
  });
  await page.getByRole('button', { name: 'Записати голосове повідомлення' }).click();
  await page.getByRole('button', { name: 'Почати запис', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Немає дозволу');
  expect(data.posts).toHaveLength(0);
  expect(data.uploads.size).toBe(0);
});

test('failed completion retries the same voice upload and sends one message', async ({ page }) => {
  const data = await backend(page, true);
  await page.goto('/');
  await start(page);
  await page.getByRole('button', { name: 'Завершити запис', exact: true }).click();
  await page.getByRole('button', { name: 'Надіслати голосове', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Не вдалося надіслати голосове' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Повторити надсилання' }).click();
  await expect(page.getByLabel('Голосове повідомлення', { exact: true })).toBeVisible();
  expect(data.posts).toHaveLength(1);
  expect(data.uploads.size).toBe(1);
});
