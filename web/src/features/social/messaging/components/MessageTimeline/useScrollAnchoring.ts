import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { flashMessage } from '../../flashMessage';
import type { DisplayItem, HistoryItem, HistoryWindow } from '../../types';

interface UseScrollAnchoringInput {
  history: HistoryWindow;
  items: HistoryItem[];
  displayItems: DisplayItem[];
  firstUnreadSeq: string | null;
}

/**
 * Keeps the viewport anchored through the three updates that would otherwise
 * yank the scroll position: prepending older history, jumping to a specific
 * message, and new messages arriving while the reader is at the bottom. Also
 * drives the older/newer page loads that scrolling near an edge implies, and
 * flashes a jumped-to message once it's actually in the DOM.
 */
export function useScrollAnchoring({
  history,
  items,
  displayItems,
  firstUnreadSeq,
}: UseScrollAnchoringInput) {
  const { pages, targetMessageId, older, newer } = history;
  const scrollRef = useRef<HTMLDivElement>(null);
  const prepend = useRef<{ height: number; top: number } | null>(null);
  const didPosition = useRef(false);
  // At the live bottom: the end of the loaded history, and that history reaches the present.
  // Only there do new messages and growing content pull the view down; near the end of a
  // window with newer pages still to load, the next page arrives below the reader instead.
  const atBottom = useRef(true);
  // The height the anchoring last answered for. A viewport that changes size fires its scroll
  // event before the observer below catches up; measured against the smaller of the two heights,
  // a reader at the bottom would read as leaving it.
  const viewportHeight = useRef(0);
  const followToPresent = useRef(false);
  const suppressOlderUntil = useRef(0);
  const lastSeq = useRef<string | undefined>(undefined);
  const lastFlashedTarget = useRef<string | null>(null);
  const [awayFromBottom, setAwayFromBottom] = useState(false);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    viewportHeight.current = container.clientHeight;
    const observer = new ResizeObserver(() => {
      const height = container.clientHeight;
      // A viewport that shrinks or grows (the keyboard) keeps what sits at its bottom in place,
      // as in any chat; a changing feed keeps the reading position instead.
      if (!atBottom.current) container.scrollTop += viewportHeight.current - height;
      viewportHeight.current = height;
      if (atBottom.current) container.scrollTop = container.scrollHeight;
    });
    observer.observe(container);
    // The feed too: a growing composer overlay or a late-loading image changes the
    // content height without resizing the viewport.
    if (container.firstElementChild) observer.observe(container.firstElementChild);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const currentLastSeq = displayItems.at(-1)?.item.id;
    if (prepend.current) {
      container.scrollTop = prepend.current.top + container.scrollHeight - prepend.current.height;
      prepend.current = null;
      lastSeq.current = currentLastSeq;
      return;
    }
    if (followToPresent.current) {
      container.scrollTop = container.scrollHeight;
      lastSeq.current = currentLastSeq;
      if (!newer.available) {
        followToPresent.current = false;
        atBottom.current = true;
      } else if (!newer.loading) void newer.load();
      return;
    }
    if (didPosition.current) {
      if (currentLastSeq !== lastSeq.current && atBottom.current)
        container.scrollTop = container.scrollHeight;
      lastSeq.current = currentLastSeq;
      return;
    }
    if (!pages.length) return;
    didPosition.current = true;
    lastSeq.current = currentLastSeq;
    const target = targetMessageId
      ? document.getElementById(`message-${targetMessageId}`)
      : firstUnreadSeq
        ? container.querySelector<HTMLElement>(`[data-seq="${firstUnreadSeq}"]`)
        : null;
    if (target) {
      const top =
        container.scrollTop +
        target.getBoundingClientRect().top -
        container.getBoundingClientRect().top -
        90;
      if (targetMessageId) {
        suppressOlderUntil.current = Date.now() + 800;
        container.scrollTo({ top, behavior: 'smooth' });
      } else {
        container.scrollTop = top;
      }
      const nearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < 110;
      atBottom.current = nearBottom && !newer.available;
      setAwayFromBottom(!atBottom.current);
    } else {
      container.scrollTop = container.scrollHeight;
      atBottom.current = !newer.available;
    }
    // newer is read fresh each run; the content it describes changes with pages.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages, items, displayItems, firstUnreadSeq, targetMessageId]);

  useEffect(() => {
    if (!targetMessageId) {
      lastFlashedTarget.current = null;
      return;
    }
    if (lastFlashedTarget.current === targetMessageId) return;
    if (!document.getElementById(`message-${targetMessageId}`)) return;
    lastFlashedTarget.current = targetMessageId;
    flashMessage(targetMessageId);
  }, [displayItems, targetMessageId]);

  async function loadOlder() {
    const container = scrollRef.current;
    if (!container || older.loading || prepend.current) return;
    prepend.current = { height: container.scrollHeight, top: container.scrollTop };
    try {
      await older.load();
    } catch {
      prepend.current = null;
    }
  }

  function onScroll() {
    const container = scrollRef.current;
    if (!container) return;
    const viewport = Math.max(viewportHeight.current, container.clientHeight);
    const nearBottom = container.scrollHeight - container.scrollTop - viewport < 110;
    atBottom.current = nearBottom && !newer.available;
    setAwayFromBottom(!atBottom.current);
    if (
      container.scrollTop < 90 &&
      older.available &&
      !older.loading &&
      Date.now() > suppressOlderUntil.current
    )
      void loadOlder();
    if (nearBottom && newer.available && !newer.loading) void newer.load();
  }

  // Newer pages load one after another, each landing at its end, until the present is in.
  function goDown() {
    if (newer.available) {
      followToPresent.current = true;
      void newer.load();
    } else scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }

  return { scrollRef, awayFromBottom, onScroll, loadOlder, goDown };
}
