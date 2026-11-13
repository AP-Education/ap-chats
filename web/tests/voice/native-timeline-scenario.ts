import type { ConversationSending } from '@/features/social/messaging/sending/stores/outboxes';

const sample = new URL('../../../test/fixtures/voice-tone.m4a', import.meta.url).href;

async function waitFor<T>(read: () => T | null | undefined | false): Promise<T> {
  const until = Date.now() + 20_000;
  while (Date.now() < until) {
    const value = read();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('Voice timeline did not reach the expected state');
}

/** A prerecorded disposable clip tests the queue and rendering inside system WebViews. */
export async function runNativeTimelineScenario(sending: ConversationSending) {
  const checks: string[] = [];
  let error: string | undefined;
  try {
    const bytes = await fetch(sample).then((response) => response.blob());
    const file = Object.assign(new File([bytes], 'voice-ui-qa.m4a', { type: 'audio/mp4' }), {
      voice: true as const,
    });
    const policy = {
      maxFiles: 10,
      maxFileBytes: 20 * 1024 * 1024,
      maxMessageBytes: 20 * 1024 * 1024,
    };
    const rejected = sending.uploads.add([file], policy);
    if (rejected.length) throw new Error('QA clip was rejected');
    const nonce = crypto.randomUUID();
    const [draft] = sending.uploads.commit(nonce);
    if (!draft) throw new Error('Missing QA upload');
    void sending.outbox.send(
      { markdown: '', blocks: [{ type: 'voice', attachmentId: draft.key, durationMs: 2000 }] },
      nonce,
    );

    const pending = await waitFor(() =>
      document.querySelector<HTMLElement>('[data-voice-message]'),
    );
    const bubble = pending.closest<HTMLElement>('[data-timeline-bubble]')!;
    const before = bubble.getBoundingClientRect();
    if (!pending.querySelector('[aria-label="Завантаження голосового"]'))
      throw new Error('Pending voice became a file card');
    if (before.width < 220 || before.height > 90)
      throw new Error('Voice bubble is not wide and compact');
    checks.push('pending uses a wide compact voice block');
    if (!pending.querySelector('time')) throw new Error('Pending time is outside the voice block');
    checks.push('pending time shares the player controls row');

    const voice = await waitFor(() => {
      const button = document.querySelector<HTMLButtonElement>(
        'button[aria-label="Відтворити голосове"]',
      );
      return button && !button.disabled && button.closest<HTMLElement>('[data-voice-message]');
    });
    const after = voice.closest<HTMLElement>('[data-timeline-bubble]')!.getBoundingClientRect();
    if (Math.abs(before.height - after.height) > 1 || Math.abs(before.width - after.width) > 1)
      throw new Error('Delivery changed the voice bubble footprint');
    checks.push('delivery keeps the same bubble footprint');
    if (document.querySelectorAll('[data-voice-message]').length !== 1)
      throw new Error('Voice duplicated on delivery');
    checks.push('one delivered voice replaces the pending block');
    const speed = voice.querySelector<HTMLButtonElement>(
      'button[aria-label="Швидкість відтворення"]',
    )!;
    speed.click();
    await waitFor(() => speed.textContent === '1.5×');
    if (voice.querySelector('audio')?.playbackRate !== 1.5)
      throw new Error('Playback rate did not update');
    checks.push('playback speed reaches the audio element');
    if (!voice.querySelector('[data-placement="voice"] time'))
      throw new Error('Delivered time is outside the controls row');
    checks.push('delivered timestamp remains inline');
    if (document.documentElement.scrollWidth > innerWidth)
      throw new Error('Voice overflows the phone');
    checks.push('phone width has no horizontal overflow');
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught);
  }
  await fetch('/api/qa-result', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer fixture-only' },
    body: JSON.stringify({
      scenario: 'voice-timeline',
      platform: navigator.userAgent,
      checks,
      error,
    }),
  });
}
