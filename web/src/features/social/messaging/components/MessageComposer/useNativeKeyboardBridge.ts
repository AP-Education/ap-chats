import { useEffect, useState } from 'react';

import { isNativeShell, onNativeMessage } from '@/shared/lib/nativeBridge';

type ComposerNativeMessage =
  | { type: 'keyboard/show'; height: number; duration: number }
  | { type: 'keyboard/hide'; duration: number };

const STORAGE_KEY = 'ap-chats:keyboard-height';
const FALLBACK_HEIGHT = 300;
// Below this, a visualViewport shrink is a browser chrome/URL-bar change, not a keyboard.
const MIN_PLAUSIBLE_KEYBOARD_HEIGHT = 80;

function readStoredHeight(): number {
  const stored = Number(localStorage.getItem(STORAGE_KEY));
  return Number.isFinite(stored) && stored > 0 ? stored : FALLBACK_HEIGHT;
}

/** Tracks the on-screen keyboard's height so the composer's emoji/GIF/sticker panel can
 * open at that exact size and swap places with the keyboard instead of visibly resizing.
 * Inside the native shell this rides the bridge (see keyboard/show in mobile's
 * types/index.ts); in a plain mobile browser (incl. local dev without an EAS build) it
 * falls back to the VisualViewport API, which iOS shrinks on keyboard show without
 * resizing the layout viewport.
 *
 * Returns the last known height even while the keyboard is hidden — callers that want
 * the seamless swap (open the picker at exactly this height) always use it as-is, never
 * gated on "is the keyboard visible right now". */
export function useNativeKeyboardBridge(): number {
  const [height, setHeight] = useState(readStoredHeight);

  useEffect(() => {
    if (isNativeShell()) {
      return onNativeMessage<ComposerNativeMessage>((message) => {
        if (message.type !== 'keyboard/show') return;
        localStorage.setItem(STORAGE_KEY, String(message.height));
        setHeight(message.height);
      });
    }

    const viewport = window.visualViewport;
    if (!viewport) return;

    function handleResize() {
      const keyboardHeight = Math.round(window.innerHeight - viewport!.height);
      if (keyboardHeight <= MIN_PLAUSIBLE_KEYBOARD_HEIGHT) return;
      localStorage.setItem(STORAGE_KEY, String(keyboardHeight));
      setHeight(keyboardHeight);
    }

    viewport.addEventListener('resize', handleResize);
    return () => viewport.removeEventListener('resize', handleResize);
  }, []);

  return height;
}
