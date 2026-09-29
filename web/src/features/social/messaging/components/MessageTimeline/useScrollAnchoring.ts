import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { flashMessage } from '../../flashMessage';
import type { HistoryPage, MessageHistoryItem } from '../../types';
import type { DisplayItem } from './useDisplayItems';

interface UseScrollAnchoringInput {
  pages: HistoryPage[];
  items: MessageHistoryItem[];
  displayItems: DisplayItem[];
  firstUnreadSeq: string | null;
  targetMessageId?: string;
  hasOlder: boolean;
  loadingOlder: boolean;
  hasNewer: boolean;
  loadingNewer: boolean;
  loadOlder: () => Promise<unknown>;
  loadNewer: () => Promise<unknown>;
}

/**
 * Keeps the viewport anchored through the three updates that would otherwise
 * yank the scroll position: prepending older history, jumping to a specific
 * message, and new messages arriving while the reader is at the bottom. Also
 * drives the older/newer page loads that scrolling near an edge implies, and
 * flashes a jumped-to message once it's actually in the DOM.
 */
export function useScrollAnchoring({
  pages,
  items,
  displayItems,
  firstUnreadSeq,
  targetMessageId,
  hasOlder,
  loadingOlder,
  hasNewer,
  loadingNewer,
  loadOlder,
  loadNewer,
}: UseScrollAnchoringInput) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prepend = useRef<{ height: number; top: number } | null>(null);
  const didPosition = useRef(false);
  const atBottom = useRef(true);
  const jumpAfterNext = useRef(false);
  const suppressOlderUntil = useRef(0);
  const lastScrollAt = useRef(0);
  const lastSeq = useRef<string | undefined>(undefined);
  const lastFlashedTarget = useRef<string | null>(null);
  const [awayFromBottom, setAwayFromBottom] = useState(false);

  useLayoutEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const currentLastSeq = displayItems.at(-1)?.nonce ?? items.at(-1)?.seq;
    if (prepend.current) {
      container.scrollTop = prepend.current.top + container.scrollHeight - prepend.current.height;
      prepend.current = null;
      lastSeq.current = currentLastSeq;
      return;
    }
    if (jumpAfterNext.current) {
      container.scrollTop = container.scrollHeight;
      jumpAfterNext.current = false;
      lastSeq.current = currentLastSeq;
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
      setAwayFromBottom(!nearBottom);
      atBottom.current = nearBottom;
    } else {
      container.scrollTop = container.scrollHeight;
    }
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

  async function older() {
    const container = scrollRef.current;
    if (!container || loadingOlder || prepend.current) return;
    prepend.current = { height: container.scrollHeight, top: container.scrollTop };
    try {
      await loadOlder();
    } catch {
      prepend.current = null;
    }
  }

  function onScroll() {
    const container = scrollRef.current;
    if (!container) return;
    lastScrollAt.current = performance.now();
    container.dataset.hoverSuppressed = 'true';
    const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 110;
    atBottom.current = nearBottom;
    setAwayFromBottom(!nearBottom);
    if (
      container.scrollTop < 90 &&
      hasOlder &&
      !loadingOlder &&
      Date.now() > suppressOlderUntil.current
    )
      void older();
    if (nearBottom && hasNewer && !loadingNewer) void loadNewer();
  }

  function goDown() {
    if (hasNewer) {
      jumpAfterNext.current = true;
      void loadNewer();
    } else scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }

  return { scrollRef, awayFromBottom, lastScrollAt, onScroll, older, goDown };
}
