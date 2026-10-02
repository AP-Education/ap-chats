import { Room } from 'livekit-client';

import type { loadCallKitModule } from './callkit-module';

export async function connectRoom(url: string, token: string): Promise<Room> {
  const room = new Room();
  await room.connect(url, token);
  return room;
}

/** CallKit/Telecom activates the audio session asynchronously after answering —
 * enabling the mic before this resolves can silently fail to capture anything.
 * Takes the already-loaded module rather than importing it statically — see
 * callkit-module.ts for why. */
export function waitForAudioSessionActive(
  CallKit: NonNullable<Awaited<ReturnType<typeof loadCallKitModule>>>,
): Promise<void> {
  if (CallKit.getAudioSession().isActive) return Promise.resolve();
  return new Promise((resolve) => {
    const subscription = CallKit.addAudioSessionActivatedListener(() => {
      subscription.remove();
      resolve();
    });
  });
}
