import { Room } from 'livekit-client';

import type { loadCallKitModule } from './callkit-module';

export async function connectRoom(url: string, token: string, signal: AbortSignal): Promise<Room> {
  if (signal.aborted) throw new Error('Call ended before connecting');
  const room = new Room();
  const cancel = () => void room.disconnect().catch(() => undefined);
  signal.addEventListener('abort', cancel, { once: true });
  try {
    await room.connect(url, token);
    if (signal.aborted) throw new Error('Call ended while connecting');
    return room;
  } catch (error) {
    await room.disconnect().catch(() => undefined);
    throw error;
  } finally {
    signal.removeEventListener('abort', cancel);
  }
}

/** CallKit/Telecom activates the audio session asynchronously after answering —
 * enabling the mic before this resolves can silently fail to capture anything.
 * Takes the already-loaded module rather than importing it statically — see
 * callkit-module.ts for why. */
export function waitForAudioSessionActive(
  CallKit: NonNullable<Awaited<ReturnType<typeof loadCallKitModule>>>,
  signal: AbortSignal,
): Promise<void> {
  if (signal.aborted) return Promise.reject(new Error('Call ended before audio activation'));
  if (CallKit.getAudioSession().isActive) return Promise.resolve();
  return new Promise((resolve, reject) => {
    let subscription: { remove(): void } | undefined = undefined;
    let settled = false;
    const timeout = setTimeout(
      () => finish(new Error('CallKit audio activation timed out')),
      10000,
    );
    const cancel = () => finish(new Error('Call ended before audio activation'));

    function finish(error?: Error) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      signal.removeEventListener('abort', cancel);
      subscription?.remove();
      if (error) reject(error);
      else resolve();
    }

    signal.addEventListener('abort', cancel, { once: true });
    subscription = CallKit.addAudioSessionActivatedListener(() => finish());
    if (settled) subscription.remove();
    else if (CallKit.getAudioSession().isActive) finish();
  });
}
