import { useEffect, useRef } from 'react';

import { useTouchGesture } from '@/shared/hooks/useTouchGesture';

// Full viewport width — matches the previous Drawer (and Discord's mobile nav),
// not the iOS/Telegram "leave a sliver visible" pattern.
const PANEL_WIDTH_RATIO = 1;
const EDGE_WIDTH = 28;
const BACKDROP_MAX_OPACITY = 0.45;

interface UseMobileNavSheetOptions {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}

/**
 * Drives a left nav panel that follows the finger 1:1 while dragging (unlike
 * AntD's Drawer, which only knows "open" or "closed" and plays its own
 * from-the-edge transition no matter where the drag already was) and animates
 * only the remaining distance on release. The open/close *state* still lives
 * in the caller (so a nav link click or the hamburger button work exactly as
 * before) — this only owns the drag-time visuals.
 */
export function useMobileNavSheet({ open, onOpen, onClose }: UseMobileNavSheetOptions) {
  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const widthRef = useRef(0);
  const draggingRef = useRef(false);
  // Set synchronously inside onSwipeRight/onSwipeLeft, read in onSwipeEnd — the
  // `open` prop itself can't be trusted there yet, since the state update that
  // committing the gesture triggers hasn't re-rendered this hook at that point.
  const committedRef = useRef(false);

  function setPosition(fraction: number, animated: boolean) {
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    const width = widthRef.current;
    if (!panel || !backdrop || !width) return;
    const clamped = Math.min(1, Math.max(0, fraction));
    panel.style.transition = animated ? '' : 'none';
    backdrop.style.transition = animated ? '' : 'none';
    panel.style.transform = `translate3d(${(clamped - 1) * width}px, 0, 0)`;
    backdrop.style.opacity = String(clamped * BACKDROP_MAX_OPACITY);
    backdrop.style.pointerEvents = clamped > 0.01 ? 'auto' : 'none';
  }

  useEffect(() => {
    function measure() {
      widthRef.current = window.innerWidth * PANEL_WIDTH_RATIO;
      if (panelRef.current) panelRef.current.style.width = `${widthRef.current}px`;
      if (!draggingRef.current) setPosition(open ? 1 : 0, false);
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
    // Deliberately runs only on mount/resize — `open` is read fresh via the ref,
    // not tracked as a dependency, so a resize mid-drag can't fight the gesture.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Anything that changes `open` other than our own drag (hamburger button, a
  // nav link, Escape) animates to the new resting position via CSS transition.
  useEffect(() => {
    if (draggingRef.current) return;
    setPosition(open ? 1 : 0, true);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const openGesture = useTouchGesture({
    shouldStart: (event) => !open && event.touches[0].clientX <= EDGE_WIDTH,
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

  return { panelRef, backdropRef, openGesture, closeGesture };
}
