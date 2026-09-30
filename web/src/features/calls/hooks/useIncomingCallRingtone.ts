import { useEffect } from 'react';

import { createCosmicRingtone } from '../sound/cosmicRingtone';

/** Plays the cosmic ringtone for as long as the calling component stays
 * mounted (an incoming call is on screen), and tears it down cleanly
 * otherwise — including when the browser blocks autoplay before any user
 * gesture has happened, which fails silently rather than throwing. */
export function useIncomingCallRingtone(): void {
  useEffect(() => {
    if (typeof AudioContext === 'undefined') return;
    const context = new AudioContext();
    const ringtone = createCosmicRingtone(context);
    void context.resume().then(
      () => ringtone.start(),
      () => undefined,
    );

    return () => ringtone.stop();
  }, []);
}
