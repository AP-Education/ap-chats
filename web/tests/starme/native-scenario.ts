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
  function write(text: string) {
    const editor = document.querySelector<HTMLElement>('[role="textbox"]')!;
    editor.focus();
    document.execCommand('insertText', false, text);
  }
  async function send() {
    await wait('Send becomes available', () => {
      const control = document.querySelector<HTMLButtonElement>('button[aria-label="Надіслати"]');
      return control && !control.disabled;
    });
    const control = document.querySelector<HTMLButtonElement>('button[aria-label="Надіслати"]');
    if (!control || control.disabled) throw new Error('Send is unavailable');
    control.click();
  }
  async function mention(text: string) {
    write('@StarMe');
    await wait('StarMe offered in human DM mentions', () =>
      document.querySelector('[role="option"]'),
    );
    (document.querySelector('[role="option"]') as HTMLElement).click();
    write(` ${text}`);
    await send();
  }
  let error: string | undefined;
  try {
    await wait('human DM entry available', () => button('Написати Івану'));
    button('Написати Івану')!.click();
    await wait('human conversation opens', () => document.querySelector('[role="textbox"]'));
    const path = location.pathname;
    write('Привіт, Іване');
    await send();
    await wait('ordinary message posted', () => document.querySelectorAll('article').length === 1);
    await new Promise((resolve) => setTimeout(resolve, 1300));
    if (document.querySelectorAll('article').length !== 1)
      throw new Error('An ordinary DM invoked AI');
    passed.push('ordinary DM does not invoke AI');
    await mention('План на тиждень');
    await wait('thinking visible', () => document.body.innerText.includes('Думаю над відповіддю'));
    await wait(
      'answer appears inside human DM',
      () => document.querySelectorAll('article').length === 3,
    );
    document
      .querySelector<HTMLElement>('[data-message-id]')!
      .dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, cancelable: true, view: window }),
      );
    await wait('Ask StarMe action offered in human DM', () => button('Запитати StarMe'));
    button('Запитати StarMe')!.click();
    await wait('selected context reaches composer', () =>
      document.body.innerText.includes('про 1 повідомлення'),
    );
    await send();
    await wait(
      'selected context receives an answer',
      () => document.querySelectorAll('article').length === 5,
    );
    await mention('Помилка агента');
    await wait(
      'failure keeps user question',
      () =>
        document.querySelector('[role="alert"]') &&
        document.querySelectorAll('article').length === 6,
    );
    button('Повторити')!.click();
    await wait(
      'retry answers once',
      () =>
        document.querySelectorAll('article').length === 7 &&
        !document.querySelector('[role="alert"]'),
    );
    button('До розмов')!.click();
    await wait('back to conversation list', () => button('Написати Івану'));
    button('Написати Івану')!.click();
    await wait(
      'history restored in same human DM',
      () => location.pathname === path && document.querySelectorAll('article').length === 7,
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
