import { type RefObject, useLayoutEffect } from 'react';

// The pinned bar and the composer float over the history so messages scroll under their
// frosted surfaces; their live heights become insets the timeline pads itself with.
export function useOverlayInsets(
  surfaceRef: RefObject<HTMLElement | null>,
  topRef: RefObject<HTMLElement | null>,
  bottomRef: RefObject<HTMLElement | null>,
) {
  useLayoutEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;

    function publish() {
      surface!.style.setProperty('--chat-inset-top', `${topRef.current?.offsetHeight ?? 0}px`);
      surface!.style.setProperty(
        '--chat-inset-bottom',
        `${bottomRef.current?.offsetHeight ?? 0}px`,
      );
    }

    publish();
    const observer = new ResizeObserver(publish);
    if (topRef.current) observer.observe(topRef.current);
    if (bottomRef.current) observer.observe(bottomRef.current);
    return () => observer.disconnect();
  }, [surfaceRef, topRef, bottomRef]);
}
