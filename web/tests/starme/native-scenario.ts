// Runs only in the disposable native QA wrapper, against the production composer and services.
export async function runNativeScenario(token: string) {
  const passed: string[] = [];
  const platform = new URLSearchParams(location.search).get('native');
  async function wait(label: string, check: () => unknown) {
    const until = Date.now() + 30_000;
    while (!check()) {
      if (Date.now() > until) throw new Error(label);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    passed.push(label);
  }
  const button = (label: string) =>
    Array.from(document.querySelectorAll('button')).find(
      (element) => element.textContent?.trim() === label,
    );
  async function send(text: string) {
    const editor = document.querySelector<HTMLElement>('[role="textbox"]')!;
    editor.focus();
    document.execCommand('insertText', false, text);
    await wait('editor accepts text', () => editor.textContent === text);
    const send = document.querySelector<HTMLButtonElement>('button[aria-label="Надіслати"]');
    if (!send || send.disabled) throw new Error('Send is unavailable');
    send.click();
  }
  let error: string | undefined;
  try {
    await wait('StarMe entry available', () => button('Написати StarMe'));
    button('Написати StarMe')!.click();
    await wait('private conversation opens', () => document.querySelector('[role="textbox"]'));
    const path = location.pathname;
    await send('План на тиждень');
    await wait('thinking visible', () => document.body.innerText.includes('Думаю над відповіддю'));
    await wait(
      'one question and one answer',
      () => document.querySelectorAll('article').length === 2,
    );
    await send('Помилка агента');
    await wait(
      'failure keeps user question',
      () =>
        document.querySelector('[role="alert"]') &&
        document.querySelectorAll('article').length === 3,
    );
    button('Повторити')!.click();
    await wait(
      'retry answers once',
      () =>
        document.querySelectorAll('article').length === 4 &&
        !document.querySelector('[role="alert"]'),
    );
    button('До розмов')!.click();
    await wait('back to conversation list', () => button('Написати StarMe'));
    button('Написати StarMe')!.click();
    await wait(
      'history restored in same conversation',
      () => location.pathname === path && document.querySelectorAll('article').length === 4,
    );
    if (document.documentElement.scrollWidth > innerWidth) throw new Error('Horizontal overflow');
    passed.push('fits phone viewport');
  } catch (failure) {
    error = String(failure);
  }
  await fetch('/api/qa/result', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      platform,
      passed,
      error,
      text: error ? document.body.innerText : undefined,
    }),
  });
}
