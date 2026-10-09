import { isNativeShell, onNativeMessage } from '@ap-education/shell-sdk';
import { type RefObject, useEffect } from 'react';

import { readKeyboardGlide } from '@/features/social/messaging/components/MessageComposer/native-input';

// Long enough for the native resize that normally ends the glide to arrive first.
const SETTLE_FALLBACK_MS = 150;

/**
 * Slides the conversation's lower parts up with the native keyboard on its own curve, then
 * lets go the moment the page takes its new, shorter size: one layout instead of one per frame.
 */
export function useKeyboardGlide(surfaceRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!isNativeShell()) return;

    let gliding = false;
    let fallback: ReturnType<typeof setTimeout> | undefined;

    function slide(shift: number, transition: string) {
      const parts = surfaceRef.current?.querySelectorAll<HTMLElement>('[data-keyboard-glide]');
      for (const part of parts ?? []) {
        part.style.transition = transition;
        part.style.translate = shift ? `0 ${-shift}px` : '';
      }
    }

    function settle() {
      clearTimeout(fallback);
      if (!gliding) return;
      gliding = false;
      slide(0, 'none');
    }

    const unsubscribe = onNativeMessage<unknown>((value) => {
      const message = readKeyboardGlide(value);
      if (!message) return;
      if (message.type === 'keyboard/glide-end') {
        fallback = setTimeout(settle, SETTLE_FALLBACK_MS);
        return;
      }
      clearTimeout(fallback);
      gliding = message.shift > 0;
      slide(message.shift, `translate ${message.duration}ms ${message.easing}`);
    });
    window.addEventListener('resize', settle);

    return () => {
      unsubscribe();
      window.removeEventListener('resize', settle);
      settle();
    };
  }, [surfaceRef]);
}
