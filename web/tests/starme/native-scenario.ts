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
    const headers = { authorization: `Bearer ${token}` };
    const state = await fetch('/api/qa/session', { headers }).then((response) => response.json());
    const channelId = path.split('/direct/')[1];
    const peerHeaders = { authorization: `Bearer ${token}_peer` };
    const historyPath = `/api/workspaces/${state.workspaceId}/channels/${channelId}/qa-history`;
    const peerHistory = async () =>
      fetch(historyPath, { headers: peerHeaders }).then((response) => response.json());
    if ((await peerHistory()).length !== 1) throw new Error('Private exchange reached the peer');
    passed.push('peer cannot see private prompts or answers');
    const answer = document.querySelector<HTMLElement>('[data-assistant-answer="true"]')!;
    const answerId = answer.dataset.messageId;
    answer.dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, cancelable: true, view: window }),
    );
    await wait('Make mine action available on private answer', () => button('Зробити моїм'));
    button('Зробити моїм')!.click();
    await wait('same answer becomes public from me', () => {
      const row = document.querySelector<HTMLElement>(`[data-message-id="${answerId}"]`);
      return row?.dataset.private === 'false' && row.dataset.author === state.user.id;
    });
    const published = await peerHistory();
    if (
      published.length !== 2 ||
      published.at(-1).id !== answerId ||
      published.at(-1).author.memberId !== state.user.id
    )
      throw new Error('Publication did not replace the original');
    if (document.querySelectorAll(`[data-message-id="${answerId}"]`).length !== 1)
      throw new Error('Duplicate answer after publication');
    passed.push('peer sees one public replacement and no private question');
    write('Продовження лише для мене');
    await send();
    await wait(
      'private mode continues after publishing',
      () => document.querySelectorAll('article').length === 9,
    );
    if ((await peerHistory()).length !== 2)
      throw new Error('Private continuation reached the peer');
    passed.push('private follow-up remains hidden from peer');
    button('Повернутися до чату')!.click();
    write('Тепер для всіх');
    await send();
    await wait(
      'public composer restored explicitly',
      () => document.querySelectorAll('article').length === 10,
    );
    if ((await peerHistory()).length !== 3) throw new Error('Public mode was not restored');
    passed.push('explicit exit restores public delivery');
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
