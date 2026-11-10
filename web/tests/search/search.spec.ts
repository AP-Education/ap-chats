import { expect, type Page, test as base } from '@playwright/test';

const test = base.extend({
  page: async ({ page, browserName }, run) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    if (browserName === 'chromium')
      await (
        await page.context().newCDPSession(page)
      ).send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await run(page);
    expect(errors).toEqual([]);
  },
});

async function openSearch(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Відкрити пошук людей і чатів' }).click();
  const input = page.getByRole('combobox', { name: 'Пошук людей і чатів' });
  await expect(input).toBeFocused();
  return input;
}

test('opening an empty search makes no directory request and Escape returns focus', async ({
  page,
}) => {
  const reads: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/search?q=')) reads.push(request.url());
  });
  await openSearch(page);
  await expect(page.getByText('Введіть ім’я колеги, назву каналу або розмови.')).toBeVisible();
  expect(reads).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Відкрити пошук людей і чатів' })).toBeFocused();
});

test('one search shows accessible channels, conversations and people as distinct results', async ({
  page,
}) => {
  const input = await openSearch(page);
  await input.fill('design');
  await expect(page.getByRole('option')).toHaveCount(3);
  for (const label of ['Канали', 'Розмови', 'Люди'])
    await expect(page.getByRole('group', { name: label, exact: true })).toBeVisible();
  await expect(input).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('option').first()).toHaveAttribute('aria-selected', 'true');
});

test('Enter opens the selected channel and Back does not resurrect the search', async ({
  page,
}) => {
  const input = await openSearch(page);
  await input.fill('design');
  await expect(page.getByRole('option')).toHaveCount(3);
  await input.press('Enter');
  await expect(page).toHaveURL(/\/channels\/design$/);
  await expect(page.getByRole('heading', { name: '# Design room' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.goBack();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Відкрити пошук людей і чатів' })).toBeVisible();
});

test('arrow navigation opens the existing DM without creating another conversation', async ({
  page,
}) => {
  let writes = 0;
  page.on('request', (request) => {
    if (request.method() === 'POST') writes++;
  });
  const input = await openSearch(page);
  await input.fill('design');
  await expect(page.getByRole('option')).toHaveCount(3);
  await input.press('ArrowDown');
  await expect(page.getByRole('option').nth(1)).toHaveAttribute('aria-selected', 'true');
  await input.press('Enter');
  await expect(page).toHaveURL(/\/direct\/dm-existing$/);
  expect(writes).toBe(0);
});

test('choosing a person delegates one DM request and blocks repeated activation', async ({
  page,
}) => {
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const writes: unknown[] = [];
  await page.route('**/api/workspaces/first/direct-messages', async (route) => {
    writes.push(route.request().postDataJSON());
    await held;
    await route.fulfill({ json: { id: 'dm-opened' } });
  });
  await (await openSearch(page)).fill('design');
  const person = page.getByRole('option').filter({ hasText: 'Design new person' });
  await person.click();
  try {
    await expect(page.getByText('Відкриваємо розмову…')).toBeVisible();
    await expect(person).toBeDisabled();
    await person.evaluate((element: HTMLButtonElement) => element.click());
    expect(writes).toEqual([{ memberId: 'new-person' }]);
  } finally {
    release();
  }
  await expect(page).toHaveURL(/\/direct\/dm-opened$/);
});

test('closing during DM creation prevents a late navigation', async ({ page }) => {
  let release!: () => void;
  let finished!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const response = new Promise<void>((resolve) => {
    finished = resolve;
  });
  await page.route('**/api/workspaces/first/direct-messages', async (route) => {
    await held;
    await route.fulfill({ json: { id: 'late-dm' } }).catch(() => undefined);
    finished();
  });
  await (await openSearch(page)).fill('design');
  await page.getByRole('option').filter({ hasText: 'Design new person' }).click();
  await expect(page.getByText('Відкриваємо розмову…')).toBeVisible();
  try {
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  } finally {
    release();
  }
  await response;
  await expect(page).toHaveURL('http://127.0.0.1:5570/');
  await page.getByRole('button', { name: 'Відкрити пошук людей і чатів' }).click();
  await expect(page.getByRole('combobox')).toHaveValue('');
});

test('a stale response cannot replace results of a newer query', async ({ page }) => {
  let release!: () => void;
  let entered!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const started = new Promise<void>((resolve) => {
    entered = resolve;
  });
  await page.route('**/search?q=old', async (route) => {
    entered();
    await held;
    await route
      .fulfill({
        json: { channels: [{ id: 'old', name: 'Stale answer' }], conversations: [], people: [] },
      })
      .catch(() => undefined);
  });
  const input = await openSearch(page);
  await input.fill('old');
  try {
    await started;
    await input.fill('design');
    await expect(page.getByRole('option')).toHaveCount(3);
  } finally {
    release();
  }
  await expect(page.getByText('Stale answer')).toHaveCount(0);
  await expect(page.getByRole('option')).toHaveCount(3);
});

test('clear removes results and an empty query does not fetch the directory', async ({ page }) => {
  const input = await openSearch(page);
  await input.fill('design');
  await expect(page.getByRole('option')).toHaveCount(3);
  await page.locator('.ant-input-clear-icon').click();
  await expect(input).toHaveValue('');
  await expect(page.getByRole('option')).toHaveCount(0);
  await expect(page.getByText('Введіть ім’я колеги, назву каналу або розмови.')).toBeVisible();
  await input.fill('no-such-person');
  await expect(page.getByText('Нічого не знайдено. Спробуйте інше ім’я або назву.')).toBeVisible();
});

test('a failed search and a failed DM remain retryable', async ({ page }) => {
  let unavailable = true;
  await page.route('**/search?q=*', (route) =>
    unavailable ? route.fulfill({ status: 503 }) : route.continue(),
  );
  await (await openSearch(page)).fill('design');
  await expect(page.getByRole('alert')).toContainText('Не вдалося виконати пошук');
  unavailable = false;
  await page.getByRole('button', { name: 'Повторити', exact: true }).click();
  await expect(page.getByRole('option')).toHaveCount(3);
  let denied = true;
  await page.route('**/direct-messages', (route) =>
    denied ? route.fulfill({ status: 403 }) : route.continue(),
  );
  const person = page.getByRole('option').filter({ hasText: 'Design new person' });
  await person.click();
  await expect(page.getByText('Не вдалося відкрити розмову. Спробуйте ще раз.')).toBeVisible();
  await expect(person).toBeEnabled();
  denied = false;
  await person.click();
  await expect(page).toHaveURL(/\/direct\/dm-opened$/);
});

test('workspace and account changes reset the query and cannot reuse another scope', async ({
  page,
}) => {
  await (await openSearch(page)).fill('design');
  await expect(page.getByRole('option')).toHaveCount(3);
  await page.evaluate(() => window.dispatchEvent(new Event('fixture:workspace-change')));
  await expect(page.getByRole('combobox')).toHaveValue('');
  await page.getByRole('combobox').fill('design');
  await expect(page.getByRole('option')).toHaveCount(1);
  await expect(page.getByRole('option')).toContainText('Design in another team');
  await page.evaluate(() => window.dispatchEvent(new Event('fixture:account-change')));
  await expect(page.getByRole('combobox')).toHaveValue('');
  await expect(page.getByRole('option')).toHaveCount(0);
});

test('access changes invalidate an open search and remove revoked results', async ({ page }) => {
  await (await openSearch(page)).fill('design');
  await expect(page.getByRole('option')).toHaveCount(3);
  await page.route('**/search?q=*', (route) =>
    route.fulfill({ json: { channels: [], conversations: [], people: [] } }),
  );
  await page.evaluate(() => window.dispatchEvent(new Event('fixture:access-changed')));
  await expect(page.getByRole('option')).toHaveCount(0);
  await expect(page.getByText('Нічого не знайдено. Спробуйте інше ім’я або назву.')).toBeVisible();
});

test('keyboard selection stays consistent when a refreshed result list shrinks', async ({
  page,
}) => {
  const input = await openSearch(page);
  await input.fill('design');
  await expect(page.getByRole('option')).toHaveCount(3);
  await input.press('ArrowDown');
  await input.press('ArrowDown');
  await expect(page.getByRole('option').last()).toHaveAttribute('aria-selected', 'true');
  await page.route('**/search?q=*', async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    await route.fulfill({ json: { ...data, people: [] } });
  });
  await page.evaluate(() => window.dispatchEvent(new Event('fixture:access-changed')));
  await expect(page.getByRole('option')).toHaveCount(2);
  await expect(page.getByRole('option').last()).toHaveAttribute('aria-selected', 'true');
  await input.press('ArrowUp');
  await expect(page.getByRole('option').first()).toHaveAttribute('aria-selected', 'true');
});

test('Back closes search; a directly linked search can also close without leaving the app', async ({
  page,
}) => {
  await openSearch(page);
  await page.goBack();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.goto('/?dark=1&chatSearch=1');
  await expect(page.getByRole('combobox')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL('http://127.0.0.1:5570/?dark=1');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('a short landscape viewport keeps the dialog and results reachable', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await (await openSearch(page)).fill('design');
  await expect(page.getByRole('option')).toHaveCount(3);
  const box = await page.getByRole('dialog').boundingBox();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(390);
  await page.getByRole('option').filter({ hasText: 'Design new person' }).click();
  await expect(page).toHaveURL(/\/direct\/dm-opened$/);
});

test('phone search remains readable above the native keyboard inset without horizontal overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await (await openSearch(page)).fill('design');
  await expect(page.getByRole('option')).toHaveCount(3);
  await page.evaluate(() =>
    document.documentElement.style.setProperty('--app-keyboard-inset', '280px'),
  );
  const input = await page.getByRole('combobox').boundingBox();
  expect(input!.y + input!.height).toBeLessThan(844 - 280);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('option').filter({ hasText: 'Design new person' }).click();
  await expect(page).toHaveURL(/\/direct\/dm-opened$/);
});
