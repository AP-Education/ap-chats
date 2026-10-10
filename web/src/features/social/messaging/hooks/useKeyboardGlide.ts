import { isNativeShell, onNativeMessage } from '@ap-education/shell-sdk';
import { type RefObject, useEffect, useReducer } from 'react';
import { flushSync } from 'react-dom';

import {
  type KeyboardGlideMessage,
  readKeyboardGlide,
} from '../components/MessageComposer/native-input';
import { GLIDE_REST, glideReducer, glideSurfaceProps } from '../keyboard-glide';

// Long enough for the resize that ends a glide to arrive first.
const RESIZE_WAIT_MS = 150;

/** Has the conversation follow the native keyboard; returns the props for its surface. */
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
      dispatch(withSupportedEasing(message));
      // A rise ends on its own resize; a fall, or the end of one, waits for one briefly.
      const awaitsResize = message.type === 'keyboard/glide-end' || message.direction === 'down';
      if (awaitsResize) expiry = setTimeout(() => dispatch({ type: 'expired' }), RESIZE_WAIT_MS);
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

  useEffect(() => {
    if (phase.kind !== 'falling') return;

    const settle = setTimeout(() => dispatch({ type: 'settled' }), phase.duration);
    return () => clearTimeout(settle);
  }, [phase]);

  return glideSurfaceProps(phase);
}

// An older WebKit without linear() would drop the whole animation; it moves on the default curve.
function withSupportedEasing(message: KeyboardGlideMessage): KeyboardGlideMessage {
  if (message.type !== 'keyboard/glide' || !message.easing) return message;

  const supported = CSS.supports('animation-timing-function', message.easing);
  return supported ? message : { ...message, easing: undefined };
}
