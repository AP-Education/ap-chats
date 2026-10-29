import { expect, test } from '@playwright/test';

for (const variant of ['chat', 'chat&portrait', 'chat&own']) {
  test(`video is framed inside its real message bubble with caption and time: ${variant}`, async ({
    page,
  }, info) => {
    const session = await page.context().newCDPSession(page);
    await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.goto(`/?${variant}`);
    const row = page.locator('#message-message');
    const poster = row.getByRole('img', { name: 'Кадр відео Зустріч команди.mp4' });
    await expect(poster).toBeVisible();
    await expect
      .poll(() => poster.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);
    await expect(row.getByText('Поглянь, будь ласка. Деталі обговоримо в чаті.')).toBeVisible();
    await expect(row.locator('time')).toBeVisible();
    await expect(page.getByText('Ось коротке відео з нашої зустрічі.')).toHaveCount(1);
    await expect(page.getByText('Дякую! Зараз перегляну 👍')).toHaveCount(1);
    await expect(page.getByRole('textbox', { name: 'Повідомлення', exact: true })).toBeVisible();
    const bubble = await row.locator('[data-variant="media"]').boundingBox();
    expect(
      await row.evaluate((node) =>
        parseFloat(getComputedStyle(node).getPropertyValue('--ant-border-radius')),
      ),
    ).toBeGreaterThan(0);
    const image = await poster.boundingBox();
    expect(image!.x).toBeGreaterThanOrEqual(bubble!.x);
    expect(image!.x + image!.width).toBeLessThanOrEqual(bubble!.x + bubble!.width + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: info.outputPath('chat.png') });
    await row.getByRole('button', { name: 'Відкрити відео Зустріч команди.mp4' }).click();
    await expect(page.getByRole('dialog', { name: 'Перегляд медіа' })).toBeVisible();
    await expect
      .poll(() => page.locator('video').evaluate((video: HTMLVideoElement) => video.readyState))
      .toBeGreaterThanOrEqual(2);
    await page.getByRole('button', { name: 'Закрити', exact: true }).click();
    await expect(page.locator('video')).toHaveCount(0);
    await expect(row).toBeVisible();
  });
}

test('the real composer sends text beside the video without losing its message', async ({
  page,
}) => {
  await page.goto('/?chat');
  await page
    .getByRole('textbox', { name: 'Повідомлення', exact: true })
    .fill('Переглянув, все видно');
  await page.getByRole('button', { name: 'Надіслати', exact: true }).click();
  await expect(
    page.getByRole('log').getByText('Переглянув, все видно', { exact: true }),
  ).toBeVisible();
  await expect(page.locator('#message-message')).toBeVisible();
});
