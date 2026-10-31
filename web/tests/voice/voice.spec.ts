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
      const attachments = (body.attachments ?? []).map(
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
          markdown: body.markdown ?? '',
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
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Почати запис', exact: true })).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Повідомлення' })).toHaveCount(0);
  await expect(page.getByText('Триває запис', { exact: true })).toBeVisible();
  await expect.poll(() => page.getByLabel('Тривалість запису').textContent()).not.toBe('0:00');
}

test('record, pause, preview and send a real audio file through the composer, upload queue and outbox', async ({
  page,
}) => {
  const data = await backend(page);
  await page.goto('/');
  await start(page);
  await page.screenshot({ path: test.info().outputPath('recording.png') });
  await page.getByRole('button', { name: 'Пауза запису', exact: true }).click();
  await expect(page.getByText('Запис на паузі')).toBeVisible();
  await page.getByRole('button', { name: 'Продовжити запис', exact: true }).click();
  await page.getByRole('button', { name: 'Завершити запис', exact: true }).click();
  await expect(page.getByLabel('Прослухати запис')).toBeVisible();
  const sendColors = await page
    .getByRole('button', { name: 'Надіслати голосове' })
    .evaluate((button) => {
      const style = getComputedStyle(button);
      return { foreground: style.color, background: style.backgroundColor };
    });
  expect(sendColors.foreground).not.toBe(sendColors.background);
  await page.screenshot({ path: test.info().outputPath('review.png') });
  await page.getByRole('button', { name: 'Прослухати запис', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Пауза прослуховування' })).toBeVisible();
  await page.getByRole('button', { name: 'Пауза прослуховування' }).click();
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
  await expect(page.getByRole('region', { name: 'Запис голосового повідомлення' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Записати голосове повідомлення' })).toBeFocused();
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

test('an incoming call releases capture, keeps the draft for review and blocks another recording', async ({
  page,
}) => {
  const data = await backend(page);
  await page.goto('/');
  await start(page);
  await page.evaluate(() => window.dispatchEvent(new Event('fixture:incoming-call')));
  await expect(page.getByLabel('Прослухати запис')).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { testActiveMicrophones: number }).testActiveMicrophones,
      ),
    )
    .toBe(0);
  expect(data.posts).toHaveLength(0);
  await page.getByRole('button', { name: 'Скасувати запис', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Записати голосове повідомлення' })).toBeDisabled();
});

test('a browser without a supported recording format explains the limitation before asking for a microphone', async ({
  page,
}) => {
  const data = await backend(page);
  await page.goto('/');
  await page.evaluate(() => {
    MediaRecorder.isTypeSupported = () => false;
  });
  await page.getByRole('button', { name: 'Записати голосове повідомлення' }).click();
  await expect(page.getByRole('alert')).toContainText('підтримку запису');
  expect(
    await page.evaluate(
      () => (window as unknown as { testActiveMicrophones: number }).testActiveMicrophones,
    ),
  ).toBe(0);
  expect(data.uploads.size).toBe(0);
});

test('permission failure can be retried directly without closing the composer', async ({
  page,
}) => {
  const data = await backend(page);
  await page.goto('/');
  await page.evaluate(() => {
    const devices = navigator.mediaDevices;
    const original = devices.getUserMedia.bind(devices);
    devices.getUserMedia = async () => {
      devices.getUserMedia = original;
      throw new DOMException('Denied', 'NotAllowedError');
    };
  });
  await page.getByRole('button', { name: 'Записати голосове повідомлення' }).click();
  await expect(page.getByRole('alert')).toContainText('Немає дозволу');
  await page.getByRole('button', { name: 'Повторити запис' }).click();
  await expect(page.getByText('Триває запис', { exact: true })).toBeVisible();
  await expect.poll(() => page.getByLabel('Тривалість запису').textContent()).not.toBe('0:00');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Записати голосове повідомлення' })).toBeFocused();
  expect(data.posts).toHaveLength(0);
});

test('cancel is available while permission is pending and a late grant cannot revive recording', async ({
  page,
}) => {
  const data = await backend(page);
  await page.goto('/');
  await page.evaluate(() => {
    const devices = navigator.mediaDevices;
    const original = devices.getUserMedia.bind(devices);
    devices.getUserMedia = () => {
      devices.getUserMedia = original;
      return new Promise((resolve) => {
        (
          window as unknown as { grantFixtureMicrophone: () => Promise<void> }
        ).grantFixtureMicrophone = async () => resolve(await original({ audio: true }));
      });
    };
  });
  await page.getByRole('button', { name: 'Записати голосове повідомлення' }).click();
  await expect(page.getByText('Підключаємо мікрофон…')).toBeVisible();
  await page.getByRole('button', { name: 'Скасувати запис' }).click();
  await page.evaluate(() =>
    (window as unknown as { grantFixtureMicrophone: () => Promise<void> }).grantFixtureMicrophone(),
  );
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { testActiveMicrophones: number }).testActiveMicrophones,
      ),
    )
    .toBe(0);
  await expect(page.getByRole('region', { name: 'Запис голосового повідомлення' })).toHaveCount(0);
  expect(data.uploads.size).toBe(0);
  await start(page);
  await page.getByRole('button', { name: 'Скасувати запис' }).click();
});

test('rapid repeated taps acquire one microphone and keep the recording toolbar inside the viewport', async ({
  page,
}) => {
  const data = await backend(page);
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Записати голосове повідомлення' })
    .evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
  await expect(page.getByText('Триває запис', { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as unknown as { testActiveMicrophones: number }).testActiveMicrophones,
    ),
  ).toBe(1);
  const toolbar = page.getByRole('region', { name: 'Запис голосового повідомлення' });
  const bounds = await toolbar.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  for (const button of await toolbar.getByRole('button').all()) {
    const bounds = await button.boundingBox();
    expect(bounds!.width).toBeGreaterThanOrEqual(44);
    expect(bounds!.height).toBeGreaterThanOrEqual(44);
  }
  await page.keyboard.press('Escape');
  expect(data.posts).toHaveLength(0);
});

async function holdMicrophone(page: Page, browserName: string) {
  await page.evaluate(() =>
    window.addEventListener(
      'pointerdown',
      (event) => {
        (window as unknown as { heldPointerId: number }).heldPointerId = event.pointerId;
      },
      { once: true, capture: true },
    ),
  );
  const microphone = page.getByRole('button', { name: 'Записати голосове повідомлення' });
  const box = (await microphone.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const touch = browserName === 'chromium' && test.info().project.name.includes('phone');
  const cdp = touch ? await page.context().newCDPSession(page) : undefined;
  if (cdp)
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x, y, id: 1 }],
    });
  else {
    await page.mouse.move(x, y);
    await page.mouse.down();
  }
  const move = async (dx: number, dy: number) => {
    if (cdp)
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: x + dx, y: y + dy, id: 1 }],
      });
    else await page.mouse.move(x + dx, y + dy, { steps: 6 });
  };
  const up = async () => {
    if (cdp) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    else await page.mouse.up();
  };
  return { move, up };
}

test('hold and release sends one real voice note and keeps pointer capture across the composer change', async ({
  page,
  browserName,
}) => {
  const data = await backend(page);
  await page.goto('/');
  const pointer = await holdMicrophone(page, browserName);
  await expect(page.getByRole('button', { name: 'Утримуйте для запису' })).toBeVisible();
  await expect.poll(() => page.getByLabel('Тривалість запису').textContent()).not.toBe('0:00');
  expect(data.posts).toHaveLength(0);
  await page.screenshot({ path: test.info().outputPath('hold.png') });
  await pointer.up();
  await expect(page.getByLabel('Голосове повідомлення', { exact: true })).toBeVisible();
  expect(data.posts).toHaveLength(1);
  expect(data.uploads.size).toBe(1);
});

test('sliding left cancels capture and releasing afterwards cannot send', async ({
  page,
  browserName,
}) => {
  const data = await backend(page);
  await page.goto('/');
  const pointer = await holdMicrophone(page, browserName);
  await expect.poll(() => page.getByLabel('Тривалість запису').textContent()).not.toBe('0:00');
  await pointer.move(-110, 0);
  await pointer.up();
  await expect(page.getByRole('region', { name: 'Запис голосового повідомлення' })).toHaveCount(0);
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

test('sliding up locks capture, release keeps recording, and send finalizes the note once', async ({
  page,
  browserName,
}) => {
  const data = await backend(page);
  await page.goto('/');
  const pointer = await holdMicrophone(page, browserName);
  await expect.poll(() => page.getByLabel('Тривалість запису').textContent()).not.toBe('0:00');
  await pointer.move(0, -90);
  await pointer.up();
  await expect(page.getByRole('button', { name: 'Пауза запису' })).toBeVisible();
  expect(data.posts).toHaveLength(0);
  expect(
    await page.evaluate(
      () => (window as unknown as { testActiveMicrophones: number }).testActiveMicrophones,
    ),
  ).toBe(1);
  await page.getByRole('button', { name: 'Надіслати голосове', exact: true }).click();
  await expect(page.getByLabel('Голосове повідомлення', { exact: true })).toBeVisible();
  expect(data.posts).toHaveLength(1);
});

test('an interrupted pointer keeps the recording for review instead of sending on release', async ({
  page,
  browserName,
}) => {
  const data = await backend(page);
  await page.goto('/');
  const pointer = await holdMicrophone(page, browserName);
  await expect.poll(() => page.getByLabel('Тривалість запису').textContent()).not.toBe('0:00');
  await page.getByRole('button', { name: 'Утримуйте для запису' }).dispatchEvent('pointercancel', {
    pointerId: await page.evaluate(
      () => (window as unknown as { heldPointerId: number }).heldPointerId,
    ),
  });
  await pointer.up();
  await expect(page.getByRole('button', { name: 'Прослухати запис', exact: true })).toBeVisible();
  expect(data.posts).toHaveLength(0);
});

test('a held gesture released before permission resolves cannot start or send later', async ({
  page,
  browserName,
}) => {
  const data = await backend(page);
  await page.goto('/');
  await page.evaluate(() => {
    const devices = navigator.mediaDevices;
    const original = devices.getUserMedia.bind(devices);
    devices.getUserMedia = () =>
      new Promise((resolve) => {
        (window as unknown as { grantHeldMicrophone: () => Promise<void> }).grantHeldMicrophone =
          async () => resolve(await original({ audio: true }));
      });
  });
  const pointer = await holdMicrophone(page, browserName);
  await expect(page.getByText('Підключаємо мікрофон…')).toBeVisible();
  await page.waitForTimeout(400);
  await pointer.up();
  await page.evaluate(() =>
    (window as unknown as { grantHeldMicrophone: () => Promise<void> }).grantHeldMicrophone(),
  );
  await expect(page.getByRole('region', { name: 'Запис голосового повідомлення' })).toHaveCount(0);
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

test('keyboard recording uses hands-free controls and send works without a pointer gesture', async ({
  page,
}) => {
  const data = await backend(page);
  await page.goto('/');
  const microphone = page.getByRole('button', { name: 'Записати голосове повідомлення' });
  await microphone.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Пауза запису' })).toBeVisible();
  await expect.poll(() => page.getByLabel('Тривалість запису').textContent()).not.toBe('0:00');
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Голосове повідомлення', { exact: true })).toBeVisible();
  expect(data.posts).toHaveLength(1);
});

async function pressSend(page: Page, label: string) {
  const button = page.getByRole('button', { name: label, exact: true });
  if (test.info().project.name === 'desktop') await button.click();
  else await button.tap();
}

test('text and voice use one consistent primary action and a tap sends text once', async ({
  page,
}) => {
  const data = await backend(page);
  await page.goto('/');
  const microphone = page.getByRole('button', { name: 'Записати голосове повідомлення' });
  await expect(microphone).toBeEnabled();
  const microphoneBox = (await microphone.boundingBox())!;
  await page.getByRole('textbox', { name: 'Повідомлення' }).fill('Перевірка кнопки надсилання');
  const send = page.getByRole('button', { name: 'Надіслати', exact: true });
  await expect(send).toBeEnabled();
  const sendBox = (await send.boundingBox())!;
  await page.screenshot({ path: test.info().outputPath('text-send.png') });
  expect(sendBox.width).toBe(microphoneBox.width);
  expect(sendBox.height).toBe(microphoneBox.height);
  expect(Math.abs(sendBox.x - microphoneBox.x)).toBeLessThanOrEqual(1);
  const colors = await send.evaluate((button) => {
    const style = getComputedStyle(button);
    return { foreground: style.color, background: style.backgroundColor };
  });
  expect(colors.foreground).toBe('rgb(255, 255, 255)');
  expect(colors.foreground).not.toBe(colors.background);
  await pressSend(page, 'Надіслати');
  await expect(page.getByText('Перевірка кнопки надсилання', { exact: true })).toBeVisible();
  await expect(microphone).toBeVisible();
  expect(data.posts).toHaveLength(1);
  expect(data.posts[0]!.markdown).toBe('Перевірка кнопки надсилання');
});

test('the first touch on Send finalizes a hands-free voice note and restores text sending', async ({
  page,
}) => {
  const data = await backend(page);
  await page.goto('/');
  await pressSend(page, 'Записати голосове повідомлення');
  await expect.poll(() => page.getByLabel('Тривалість запису').textContent()).not.toBe('0:00');
  await pressSend(page, 'Надіслати голосове');
  await expect(page.getByLabel('Голосове повідомлення', { exact: true })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { testActiveMicrophones: number }).testActiveMicrophones,
      ),
    )
    .toBe(0);
  expect(data.posts).toHaveLength(1);
  await page.getByRole('textbox', { name: 'Повідомлення' }).fill('Текст після голосового');
  await pressSend(page, 'Надіслати');
  await expect(page.getByText('Текст після голосового', { exact: true })).toBeVisible();
  expect(data.posts).toHaveLength(2);
});

test('a locked hold can be reviewed and sent with the first touch', async ({
  page,
  browserName,
}) => {
  const data = await backend(page);
  await page.goto('/');
  const pointer = await holdMicrophone(page, browserName);
  await expect.poll(() => page.getByLabel('Тривалість запису').textContent()).not.toBe('0:00');
  await pointer.move(0, -90);
  await pointer.up();
  await pressSend(page, 'Завершити запис');
  await expect(page.getByRole('button', { name: 'Прослухати запис' })).toBeVisible();
  await pressSend(page, 'Надіслати голосове');
  await expect(page.getByLabel('Голосове повідомлення', { exact: true })).toBeVisible();
  expect(data.posts).toHaveLength(1);
});
