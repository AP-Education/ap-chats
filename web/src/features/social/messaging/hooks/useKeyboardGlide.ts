import { isNativeShell, onNativeMessage } from '@ap-education/shell-sdk';
import { type RefObject, useEffect, useReducer } from 'react';
import { flushSync } from 'react-dom';

import { GLIDE_REST, glideReducer, glideSurfaceProps, readKeyboardGlide } from '../keyboard-glide';

// Long enough for the resize that ends a glide to arrive first.
const RESIZE_WAIT_MS = 150;

/**
 * Has the conversation follow the native keyboard (see keyboard-glide). Returns the props for
 * the conversation surface whose size the native shell changes once per keyboard move.
 */
export function useKeyboardGlide(surfaceRef: RefObject<HTMLElement | null>) {
  const [phase, dispatch] = useReducer(glideReducer, GLIDE_REST);

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!isNativeShell() || !surface) return;

    let expiry: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = onNativeMessage<unknown>((value) => {
      const message = readKeyboardGlide(value);
      if (!message) return;
      clearTimeout(expiry);
      dispatch(message);
      // A rise ends on its own resize; a fall, or the end of one, waits for one briefly.
      if (message.type === 'keyboard/glide-end' || message.direction === 'down')
        expiry = setTimeout(() => dispatch({ type: 'expired' }), RESIZE_WAIT_MS);
    });

    // An observer rather than the resize event: WebKit paints the new size before it fires the
    // event, showing the parts out of place for a frame, while observers run before that paint.
    let height = surface.clientHeight;
    const observer = new ResizeObserver(() => {
      if (surface.clientHeight === height) return;
      height = surface.clientHeight;
      clearTimeout(expiry);
      flushSync(() => dispatch({ type: 'resized' }));
    });
    observer.observe(surface);

    return () => {
      unsubscribe();
      observer.disconnect();
      clearTimeout(expiry);
    };
  }, [surfaceRef]);

  return glideSurfaceProps(phase);
}
