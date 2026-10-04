import { expect, test } from '@playwright/test';
import sharp from 'sharp';

const photo = await sharp({
  create: { width: 640, height: 420, channels: 3, background: '#8ab8ad' },
})
  .png()
  .toBuffer();

test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', (route) => route.fulfill({ body: '' }));
  const sessions = new Map<string, { name: string; size: number }>();
  await page.route('**/api/workspaces/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path.endsWith('/policy'))
      return route.fulfill({
        json: {
          maxFileBytes: 1_000_000_000,
          maxMessageBytes: 2_000_000_000,
          maxFiles: 10,
          partBytes: 16 * 1024 * 1024,
        },
      });
    if (path.endsWith('/uploads') && request.method() === 'POST') {
      const id = crypto.randomUUID();
      sessions.set(id, request.postDataJSON());
      return route.fulfill({
        json: {
          id,
          partBytes: 16 * 1024 * 1024,
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
        },
      });
    }
    const id = path.split('/uploads/')[1]?.split('/')[0];
    if (path.endsWith('/part'))
      return route.fulfill({
        json: { url: `http://127.0.0.1:5567/storage/${id}/${request.postDataJSON().number}` },
      });
    if (path.endsWith('/complete')) {
      const session = sessions.get(id!)!;
      const image = session.name.endsWith('.png');
      return route.fulfill({
        json: {
          id,
          ...session,
          preview: image ? 'image' : null,
          mediaType: image ? 'image/png' : 'application/octet-stream',
          width: image ? 640 : null,
          height: image ? 420 : null,
          description: null,
        },
      });
    }
    if (path.endsWith('/url'))
      return route.fulfill({ json: { url: 'http://127.0.0.1:5567/sample.png' } });
    if (path.endsWith('/mention-candidates'))
      return route.fulfill({
        json: [{ memberId: 'member-olena', displayName: 'Олена Коваль', avatarPath: null }],
      });
    if (path.endsWith('/messages') && request.method() === 'POST') {
      const input = request.postDataJSON();
      const attachments = (input.attachments ?? []).map((ref: { id: string }) => ({
        id: ref.id,
        ...sessions.get(ref.id),
        preview: null,
        mediaType: 'application/octet-stream',
        width: null,
        height: null,
        description: null,
      }));
      return route.fulfill({
        json: {
          id: crypto.randomUUID(),
          seq: '3',
          authorMemberId: 'member',
          clientNonce: input.clientNonce,
          markdown: input.markdown,
          attachments,
          contentVersion: 1,
          revision: 1,
          replyToMessageId: null,
          quoteText: null,
          isForwarded: false,
          forwardedFromMemberId: null,
          createdAt: new Date().toISOString(),
          editedAt: null,
          deletedAt: null,
        },
      });
    }
    return route.fulfill({
      status: request.method() === 'DELETE' ? 204 : 200,
      body: request.method() === 'DELETE' ? '' : '[]',
    });
  });
  await page.route('**/storage/**', (route) => route.fulfill({ status: 200, body: '' }));
  await page.route('**/sample.png', (route) =>
    route.fulfill({ contentType: 'image/png', body: photo }),
  );
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'Додати файл', exact: true }).filter({ visible: true }),
  ).toBeEnabled();
});

test('previews files and sends an attachment without a caption', async ({ page }, testInfo) => {
  const payloads: Record<string, unknown>[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.endsWith('/messages') && request.method() === 'POST')
      payloads.push(request.postDataJSON());
  });
  await page.locator('input[type=file]').setInputFiles([
    { name: 'Огляд дизайну.png', mimeType: 'image/png', buffer: photo },
    {
      name: 'План зустрічі.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.7 sample'),
    },
  ]);
  await expect(page.getByRole('status').filter({ hasText: 'Готово' })).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Надіслати', exact: true })).toBeEnabled();
  await expect(
    page.getByRole('button', { name: 'Переглянути Огляд дизайну.png', exact: true }),
  ).toBeVisible();
  await page.screenshot({ animations: 'disabled', path: testInfo.outputPath('composer.png') });
  await page.getByRole('button', { name: 'Прибрати Огляд дизайну.png', exact: true }).click();
  await page.getByRole('button', { name: 'Надіслати', exact: true }).click();
  await expect.poll(() => payloads.length).toBe(1);
  expect(payloads[0]?.markdown).toBe('');
  // Only the attachment ref (id, optional description) belongs on the wire —
  // not the full local Attachment the composer renders previews from.
  expect(payloads[0]?.attachments).toEqual([{ id: expect.any(String) }]);
  await expect(page.getByRole('region', { name: 'Вкладення до повідомлення' })).toHaveCount(0);
});

test('rejects oversized files before creating an upload and preserves text', async ({ page }) => {
  let sessions = 0;
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.endsWith('/uploads') && request.method() === 'POST')
      sessions++;
  });
  await page
    .getByRole('textbox', { name: 'Повідомлення', exact: true })
    .fill('Текст лишається у чернетці');
  await page.locator('input[type=file]').evaluate((node: HTMLInputElement) => {
    const transfer = new DataTransfer();
    const file = new File(['small'], 'Великий архів.zip');
    Object.defineProperty(file, 'size', { value: 1_000_000_001 });
    transfer.items.add(file);
    node.files = transfer.files;
    node.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(page.getByText('Великий архів.zip: ліміт 1 GB на файл')).toBeVisible();
  expect(sessions).toBe(0);
  await expect(page.getByRole('textbox', { name: 'Повідомлення', exact: true })).toHaveText(
    'Текст лишається у чернетці',
  );
});

test('retry sends only failed multipart chunks', async ({ page }) => {
  const counts = new Map<string, number>();
  let fail = true;
  await page.route('**/storage/**', (route) => {
    const part = new URL(route.request().url()).pathname.split('/').at(-1)!;
    counts.set(part, (counts.get(part) ?? 0) + 1);
    return route.fulfill({ status: part === '2' && fail ? 400 : 200, body: '' });
  });
  await page.locator('input[type=file]').setInputFiles({
    name: 'Великий архів.zip',
    mimeType: 'application/zip',
    buffer: Buffer.alloc(16 * 1024 * 1024 + 128),
  });
  await expect(page.getByText('Помилка завантаження', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Надіслати', exact: true })).toBeDisabled();
  fail = false;
  await page.getByRole('button', { name: 'Повторити', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Готово' })).toHaveCount(1);
  expect(counts.get('1')).toBe(1);
  expect(counts.get('2')).toBe(2);
});

test('image viewer opens from the keyboard and page stays within the viewport', async ({
  page,
}, testInfo) => {
  const image = page.getByRole('button', { name: 'Переглянути План команди.png', exact: true });
  await image.focus();
  await image.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(
    page
      .getByRole('dialog')
      .getByRole('img', { name: 'План роботи команди на квартал', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('dialog')).toBeInViewport();
  const bounds = await page.getByRole('dialog').boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.screenshot({ animations: 'disabled', path: testInfo.outputPath('viewer.png') });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('clipboard files and dropping files into history attach to the composer', async ({ page }) => {
  await page.getByRole('textbox', { name: 'Повідомлення', exact: true }).evaluate((node) => {
    const transfer = new DataTransfer();
    transfer.items.add(new File(['clipboard'], 'Вставлений файл.txt', { type: 'text/plain' }));
    node.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: transfer, bubbles: true, cancelable: true }),
    );
  });
  await expect(page.getByRole('status').filter({ hasText: 'Готово' })).toHaveCount(1);
  await page.getByRole('log').evaluate((node) => {
    const transfer = new DataTransfer();
    transfer.items.add(new File(['drop'], 'Перетягнутий файл.txt', { type: 'text/plain' }));
    node.dispatchEvent(
      new DragEvent('dragenter', { dataTransfer: transfer, bubbles: true, cancelable: true }),
    );
    node.dispatchEvent(
      new DragEvent('drop', { dataTransfer: transfer, bubbles: true, cancelable: true }),
    );
  });
  await expect(page.getByRole('status').filter({ hasText: 'Готово' })).toHaveCount(2);
});

test('picking a mention candidate inserts a chip and sends the member token', async ({ page }) => {
  const payloads: Record<string, unknown>[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.endsWith('/messages') && request.method() === 'POST')
      payloads.push(request.postDataJSON());
  });
  const textbox = page.getByRole('textbox', { name: 'Повідомлення', exact: true });
  await textbox.click();
  await textbox.pressSequentially('@Оле');
  const option = page.getByRole('option', { name: 'Олена Коваль', exact: true });
  await expect(option).toBeVisible();
  await option.click();
  await expect(page.getByRole('listbox', { name: 'Згадати людину' })).toHaveCount(0);
  await expect(textbox).toContainText('@Олена Коваль');
  await page.getByRole('button', { name: 'Надіслати', exact: true }).click();
  await expect.poll(() => payloads.length).toBe(1);
  expect(payloads[0]?.markdown).toContain(':member[member-olena]');
});
