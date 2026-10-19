import './overlay-insets.css';

import { type RefObject, useId, useLayoutEffect } from 'react';

// The pinned bar and the composer float over the history so messages scroll under their
// frosted surfaces; their live heights become insets the timeline pads itself with.
export function useOverlayInsets(
  surfaceRef: RefObject<HTMLElement | null>,
  topRef: RefObject<HTMLElement | null>,
  bottomRef: RefObject<HTMLElement | null>,
) {
  const scope = useId();

  useLayoutEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;

    // A rule for the marked readers instead of a property on the surface, which every message
    // below it would inherit and restyle for (see overlay-insets.css).
    surface.dataset.overlayInsets = scope;
    const sheet = document.createElement('style');
    document.head.append(sheet);

    function publish() {
      const top = topRef.current?.offsetHeight ?? 0;
      const bottom = bottomRef.current?.offsetHeight ?? 0;
      sheet.textContent = `[data-overlay-insets="${scope}"] [data-chat-inset] { --chat-inset-top: ${top}px; --chat-inset-bottom: ${bottom}px; }`;
    }

    publish();
    const observer = new ResizeObserver(publish);
    if (topRef.current) observer.observe(topRef.current);
    if (bottomRef.current) observer.observe(bottomRef.current);
    return () => {
      observer.disconnect();
      sheet.remove();
      delete surface.dataset.overlayInsets;
    };
  }, [scope, surfaceRef, topRef, bottomRef]);
}
