import { expect, type Page, test } from '@playwright/test';

const position = (page: Page) =>
  page.locator('[data-composer]').evaluate((element) => element.getBoundingClientRect().bottom);
const send = (page: Page, inset: number, duration = 250) =>
  page.evaluate(({ inset, duration }) => window.keyboardFixture.send(inset, duration), {
    inset,
    duration,
  });
const nextFrame = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );

test.beforeEach(async ({ page, browserName }) => {
  if (browserName === 'chromium') {
    const client = await page.context().newCDPSession(page);
    await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  }
  await page.goto('/');
  await expect(page.getByRole('textbox')).toBeVisible();
  await expect.poll(() => page.evaluate(() => typeof window.keyboardFixture)).toBe('object');
});

test('opening and closing keeps the composer at the keyboard edge', async ({ page }) => {
  const height = page.viewportSize()!.height;
  await page.getByRole('textbox').tap();
  await page.getByRole('textbox').pressSequentially('Повідомлення');
  await send(page, 300);
  await expect.poll(() => position(page)).toBeCloseTo(height - 300, 0);
  await send(page, 0);
  await expect.poll(() => position(page)).toBeCloseTo(height, 0);
  await expect(page.getByRole('textbox')).toHaveText('Повідомлення');
});

test('closing during a rise starts from the current position', async ({ page }) => {
  const height = page.viewportSize()!.height;
  const change = await page.evaluate(async () => {
    const composer = document.querySelector<HTMLElement>('[data-composer]')!;
    window.keyboardFixture.send(300, 800);
    while (composer.getBoundingClientRect().bottom >= innerHeight - 90) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
    const before = composer.getBoundingClientRect().bottom;
    window.keyboardFixture.send(0, 600);
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    return composer.getBoundingClientRect().bottom - before;
  });
  expect(Math.abs(change)).toBeLessThan(65);
  await expect.poll(() => position(page)).toBeCloseTo(height, 0);
});

test('a new keyboard height during a rise continues from the current position', async ({
  page,
}) => {
  const height = page.viewportSize()!.height;
  const change = await page.evaluate(async () => {
    const composer = document.querySelector<HTMLElement>('[data-composer]')!;
    window.keyboardFixture.send(260, 800);
    while (composer.getBoundingClientRect().bottom >= innerHeight - 60) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
    const before = composer.getBoundingClientRect().bottom;
    const started = performance.now();
    window.keyboardFixture.send(300, 600);
    const immediate = composer.getBoundingClientRect().bottom;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    return {
      jump: immediate - before,
      distance: composer.getBoundingClientRect().bottom - before,
      elapsed: performance.now() - started,
    };
  });
  expect(Math.abs(change.jump)).toBeLessThan(1);
  const allowedProgress = change.elapsed * 2 + 1;
  expect(Math.abs(change.distance)).toBeLessThan(allowedProgress);
  await expect.poll(() => position(page)).toBeCloseTo(height - 300, 0);
});

test('an early shell resize does not snap the composer to the final height', async ({ page }) => {
  const height = page.viewportSize()!.height;
  await send(page, 300, 800);
  await expect.poll(() => position(page), { intervals: [16] }).toBeLessThan(height - 60);
  const before = await position(page);
  await page.evaluate(() => window.keyboardFixture.commit(300));
  await nextFrame(page);
  const after = await position(page);
  expect(before - after).toBeLessThan(90);
  await expect.poll(() => position(page)).toBeCloseTo(height - 300, 0);
});

test('a repeated inset cannot cancel an active keyboard move', async ({ page }) => {
  const height = page.viewportSize()!.height;
  const motion = await page.evaluate(async () => {
    const composer = document.querySelector<HTMLElement>('[data-composer]')!;
    window.keyboardFixture.send(300, 800);
    while (composer.getBoundingClientRect().bottom >= innerHeight - 60) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
    const animation = composer.getAnimations().find((entry) => entry.playState === 'running');
    const before = composer.getBoundingClientRect().bottom;
    const started = Number(animation?.currentTime);
    window.keyboardFixture.send(300, 0);
    const immediate = composer.getBoundingClientRect().bottom;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    return {
      jump: immediate - before,
      moved: before - composer.getBoundingClientRect().bottom,
      continued: animation?.playState === 'running' && composer.getAnimations().includes(animation),
      elapsed: Number(animation?.currentTime) - started,
    };
  });
  expect(Math.abs(motion.jump)).toBeLessThan(1);
  expect(motion.continued).toBe(true);
  expect(motion.moved).toBeGreaterThan(0);
  expect(motion.elapsed).toBeGreaterThan(0);
  await expect.poll(() => position(page)).toBeCloseTo(height - 300, 0);
});

test('multiline text and an instant height adjustment keep the field above the keyboard', async ({
  page,
}) => {
  const height = page.viewportSize()!.height;
  await send(page, 260, 0);
  const editor = page.getByRole('textbox');
  await editor.fill('Перший рядок\nДругий рядок\nТретій рядок\nЧетвертий рядок');
  await send(page, 300, 0);
  await expect.poll(() => position(page)).toBeCloseTo(height - 300, 0);
  await expect(editor).toBeFocused();
  const bounds = await editor.boundingBox();
  expect(bounds!.y).toBeGreaterThan(54);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(height - 300);
});

test('switching conversation with an open keyboard still follows its closing motion', async ({
  page,
}) => {
  const height = page.viewportSize()!.height;
  await send(page, 300, 0);
  await expect.poll(() => position(page)).toBeCloseTo(height - 300, 0);
  await page.evaluate(() => window.keyboardFixture.remount());
  await nextFrame(page);
  const change = await page.evaluate(async () => {
    const composer = document.querySelector<HTMLElement>('[data-composer]')!;
    const before = composer.getBoundingClientRect().bottom;
    window.keyboardFixture.send(0, 600);
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    return composer.getBoundingClientRect().bottom - before;
  });
  expect(Math.abs(change)).toBeLessThan(65);
  await expect.poll(() => position(page)).toBeCloseTo(height, 0);
});

test('replacement history inherits the current keyboard motion without a new inset', async ({
  page,
}) => {
  const history = await page.getByRole('log').elementHandle();
  if (!history) throw new Error('The timeline is missing');

  try {
    const replacement = await history.evaluate(async (old) => {
      const composer = document.querySelector<HTMLElement>('[data-composer]')!;
      window.keyboardFixture.send(300, 2000);
      while (composer.getBoundingClientRect().bottom >= innerHeight - 60) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      }
      window.keyboardFixture.remountHistory();
      while (old.isConnected) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      }
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      const next = document.querySelector<HTMLElement>('[role="log"]')!;
      const translation = (element: Element) =>
        Number.parseFloat(getComputedStyle(element).translate.split(' ')[1] ?? '0');
      return {
        difference: Math.abs(translation(next) - translation(composer)),
        moving: next.getAnimations().some((animation) => animation.playState === 'running'),
        oldTranslation: (old as HTMLElement).style.translate,
        oldAnimations: old.getAnimations().length,
      };
    });
    expect(replacement.difference).toBeLessThan(2);
    expect(replacement.moving).toBe(true);
    expect(replacement.oldTranslation).toBe('');
    expect(replacement.oldAnimations).toBe(0);
    await expect.poll(() => position(page)).toBeCloseTo(page.viewportSize()!.height - 300, 0);
  } finally {
    await history.dispose();
  }
});

test('new messages inside a history part do not restart its keyboard animation', async ({
  page,
}) => {
  const continued = await page.evaluate(async () => {
    const composer = document.querySelector<HTMLElement>('[data-composer]')!;
    window.keyboardFixture.send(300, 1200);
    while (composer.getBoundingClientRect().bottom >= innerHeight - 60) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
    const animation = composer.getAnimations().find((entry) => entry.playState === 'running');
    const message = document.createElement('p');
    message.textContent = 'Нове повідомлення';
    document.querySelector('[role="log"]')!.append(message);
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    return Boolean(animation && composer.getAnimations().includes(animation));
  });
  expect(continued).toBe(true);
  await expect.poll(() => position(page)).toBeCloseTo(page.viewportSize()!.height - 300, 0);
});
