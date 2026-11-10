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
  const recorded = seconds => {
    const value = document.querySelector('[aria-label="Тривалість запису"]')?.textContent || '';
    const parts = value.split(':');
    return parts.length === 2 && Number(parts[0]) * 60 + Number(parts[1]) >= seconds;
  };
  const button = label => document.querySelector('button[aria-label="' + label + '"]');
  const textButton = text => button(text) || Array.from(document.querySelectorAll('button')).find(element => element.textContent.trim() === text);
  try {
    const mic = await wait(() => { const element = button('Записати голосове повідомлення'); return element && !element.disabled && element; });
    const rect = mic.getBoundingClientRect();
    const point = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    const pointer = (element, type, x, y) => element.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 71, pointerType: 'touch', isPrimary: true, button: 0, buttons: type === 'pointerup' ? 0 : 1, clientX: x, clientY: y }));
    pointer(mic, 'pointerdown', point.x, point.y);
    await wait(() => recorded(2));
    pointer(mic, 'pointermove', point.x, point.y - 90);
    pointer(mic, 'pointerup', point.x, point.y - 90);
    await wait(() => button('Пауза запису'));
    checks.push('native microphone hold and slide-up lock keep recording after release');
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
    const cancelledMic = await wait(() => button('Записати голосове повідомлення'));
    pointer(cancelledMic, 'pointerdown', point.x, point.y);
    await wait(() => recorded(1));
    pointer(cancelledMic, 'pointermove', point.x - 110, point.y);
    pointer(cancelledMic, 'pointerup', point.x - 110, point.y);
    await wait(() => !document.querySelector('[aria-label="Запис голосового повідомлення"]'));
    if (document.querySelectorAll('.fixture-bubble').length !== 1) throw new Error('Cancel posted a voice message');
    checks.push('slide-left cancellation releases native capture without posting');
    const heldMic = await wait(() => button('Записати голосове повідомлення'));
    pointer(heldMic, 'pointerdown', point.x, point.y);
    await wait(() => recorded(1));
    pointer(heldMic, 'pointerup', point.x, point.y);
    await wait(() => document.querySelectorAll('.fixture-bubble').length === 2);
    checks.push('held release finalizes and sends native voice once');
    await fetch('/api/qa-result', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer fixture-only' }, body: JSON.stringify({ platform: navigator.userAgent, scenario: 'web-native-bridge', checks }) });
  } catch (error) {
    await fetch('/api/qa-result', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer fixture-only' }, body: JSON.stringify({ platform: navigator.userAgent, scenario: 'web-native-bridge', checks, error: error.message, status: document.querySelector('[aria-label="Запис голосового повідомлення"]')?.textContent }) });
  }
})(); true;
`;
