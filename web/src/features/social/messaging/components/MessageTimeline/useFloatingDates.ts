import { type RefObject, useEffect } from 'react';

// How long the history rests before a floating date steps aside.
const SETTLE_MS = 1000;

/**
 * A chat app's floating date: once a day's date sticks to the top of the history, it shows
 * while the history moves and steps aside when it settles, never resting on a message. In
 * its own place, above the day's first message, it always shows. Marks the scroller
 * `data-scrolling` while it moves and each stuck bar `data-stuck`, for the bars' styles.
 */
export function useFloatingDates(scrollRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;

    let settle: ReturnType<typeof setTimeout> | undefined;
    let frame = 0;
    const markStuck = () => {
      frame = 0;
      for (const bar of scroller.querySelectorAll<HTMLElement>('[data-day-bar]')) {
        const section = bar.parentElement;
        if (!section) continue;
        const offset = bar.getBoundingClientRect().top - section.getBoundingClientRect().top;
        bar.toggleAttribute('data-stuck', offset > parseFloat(getComputedStyle(bar).marginTop) + 1);
      }
    };
    const onScroll = () => {
      scroller.setAttribute('data-scrolling', '');
      clearTimeout(settle);
      settle = setTimeout(() => scroller.removeAttribute('data-scrolling'), SETTLE_MS);
      if (!frame) frame = requestAnimationFrame(markStuck);
    };

    // Days also shift without a scroll, as messages arrive, load or go.
    const resized = new ResizeObserver(() => {
      if (!frame) frame = requestAnimationFrame(markStuck);
    });
    if (scroller.firstElementChild) resized.observe(scroller.firstElementChild);
    markStuck();
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      resized.disconnect();
      scroller.removeEventListener('scroll', onScroll);
      clearTimeout(settle);
      cancelAnimationFrame(frame);
    };
  }, [scrollRef]);
}
