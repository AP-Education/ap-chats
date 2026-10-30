// Conventional end-to-end QA in our own WebView: the production composer sends over the real bridge.
export const NATIVE_WEB_SCENARIO = `
(async function () {
  const checks = [];
  const wait = async (read) => {
    for (let count = 0; count < 300; count++) {
      const value = read(); if (value) return value;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('Timed out waiting for voice UI');
  };
  const button = label => document.querySelector('button[aria-label="' + label + '"]');
  const textButton = text => Array.from(document.querySelectorAll('button')).find(element => element.textContent.trim() === text);
  try {
    const mic = await wait(() => { const element = button('Записати голосове повідомлення'); return element && !element.disabled && element; });
    mic.click();
    (await wait(() => textButton('Почати запис'))).click();
    await wait(() => document.querySelector('[aria-label="Тривалість запису"]')?.textContent === '0:02');
    checks.push('WebView composer starts native microphone');
    (await wait(() => textButton('Пауза запису'))).click();
    (await wait(() => textButton('Продовжити запис'))).click();
    await new Promise(resolve => setTimeout(resolve, 700));
    (await wait(() => textButton('Завершити запис'))).click();
    (await wait(() => textButton('Прослухати запис'))).click();
    await wait(() => textButton('Пауза прослуховування'));
    checks.push('native preview controlled from WebView');
    (await wait(() => textButton('Надіслати голосове'))).click();
    await wait(() => document.querySelector('.fixture-bubble [aria-label="Голосове повідомлення"]'));
    checks.push('native file uploads through production web queue and outbox', 'voice bubble appears in chat');
    const play = await wait(() => button('Відтворити голосове'));
    play.click();
    await wait(() => document.querySelector('.fixture-bubble audio')?.src);
    play.click();
    checks.push('chat audio URL resolves');
    await fetch('/api/qa-result', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer fixture-only' }, body: JSON.stringify({ platform: navigator.userAgent, scenario: 'web-native-bridge', checks }) });
  } catch (error) {
    await fetch('/api/qa-result', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer fixture-only' }, body: JSON.stringify({ scenario: 'web-native-bridge', checks, error: error.message }) });
  }
})(); true;
`;
