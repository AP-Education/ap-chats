import { useEffect } from 'react';

import { getSharedAudioContext } from '@/shared/audio/audio-context';

import { createCosmicRingtone } from '../sound/cosmicRingtone';

export function useIncomingCallRingtone(): void {
  useEffect(() => {
    const context = getSharedAudioContext();
    if (!context) return;
    let cancelled = false;
    let ringtone: ReturnType<typeof createCosmicRingtone> | undefined;

    void context.resume().then(
      () => {
        if (cancelled) return;
        ringtone = createCosmicRingtone(context);
        ringtone.start();
      },
      () => undefined,
    );

    return () => {
      cancelled = true;
      ringtone?.stop();
    };
  }, []);
}
