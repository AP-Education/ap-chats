import { useEffect, useRef } from 'react';

import { useTouchGesture } from '@/shared/hooks/useTouchGesture';

export const MOBILE_NAV_EDGE_WIDTH = 28;
// How far the resting (closed) nav panel peeks in from the left edge — matches
// the `-32px` resting transform in useMainLayoutStyles's `mobilePanel`.
const PANEL_REST_OFFSET = 32;

interface UseMobileNavSheetOptions {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}

/**
 * Drives the drag-time visuals for the mobile nav panel and the content pane
 * it sits behind, so both follow the finger 1:1 while dragging (unlike a CSS
 * transition alone, which only knows "open" or "closed" and always plays the
 * full-distance animation no matter where the drag already was) and animate
 * only the remaining distance on release. The open/close *state* still lives
 * in the caller (so a nav link click or the header's menu button work exactly
 * as before) — this only owns the drag-time visuals, via the same
 * `data-open`/`data-menu-open` attributes and transition that a non-drag open
 * or close already uses.
 */
export function useMobileNavSheet({ open, onOpen, onClose }: UseMobileNavSheetOptions) {
  const panelRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const widthRef = useRef(0);
  const draggingRef = useRef(false);
  // Set synchronously inside onSwipeRight/onSwipeLeft, read in onSwipeEnd — the
  // `open` prop itself can't be trusted there yet, since the state update that
  // committing the gesture triggers hasn't re-rendered this hook at that point.
  const committedRef = useRef(false);

  function setPosition(fraction: number, animated: boolean) {
    const panel = panelRef.current;
    const content = contentRef.current;
    if (!panel || !content) return;
    const clamped = Math.min(1, Math.max(0, fraction));
    panel.style.transition = animated ? '' : 'none';
    content.style.transition = animated ? '' : 'none';
    if (animated) {
      // Let the stylesheet's [data-open]/[data-menu-open] transition take back
      // over for the resting positions instead of fighting it with inline styles.
      panel.style.transform = '';
      content.style.transform = '';
      return;
    }
    panel.style.transform = `translate3d(${(clamped - 1) * PANEL_REST_OFFSET}px, 0, 0)`;
    content.style.transform = `translate3d(${clamped * 100}%, 0, 0)`;
  }

  useEffect(() => {
    function measure() {
      widthRef.current = contentRef.current?.clientWidth || window.innerWidth;
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Anything that changes `open` other than our own drag (a nav link, the
  // header's menu button, Escape) animates to the new resting position via
  // the stylesheet's own transition.
  useEffect(() => {
    if (draggingRef.current) return;
    setPosition(open ? 1 : 0, true);
  }, [open]);

  const openGesture = useTouchGesture({
    shouldStart: (event) => !open && event.touches[0].clientX <= MOBILE_NAV_EDGE_WIDTH,
    onSwipeProgress: (dx) => {
      draggingRef.current = true;
      setPosition(Math.max(0, dx) / widthRef.current, false);
    },
    onSwipeRight: () => {
      committedRef.current = true;
      setPosition(1, true);
      onOpen();
      return true;
    },
    onSwipeEnd: () => {
      draggingRef.current = false;
      if (!committedRef.current) setPosition(0, true);
      committedRef.current = false;
    },
  });

  const closeGesture = useTouchGesture({
    shouldStart: () => open,
    onSwipeProgress: (dx) => {
      draggingRef.current = true;
      setPosition(1 + Math.min(0, dx) / widthRef.current, false);
    },
    onSwipeLeft: () => {
      committedRef.current = true;
      setPosition(0, true);
      onClose();
      return true;
    },
    onSwipeEnd: () => {
      draggingRef.current = false;
      if (!committedRef.current) setPosition(1, true);
      committedRef.current = false;
    },
  });

  return { panelRef, contentRef, openGesture, closeGesture };
}
