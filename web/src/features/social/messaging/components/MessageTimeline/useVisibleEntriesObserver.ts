import { type RefObject, useEffect } from 'react';

import { useIsPageVisible } from '@/shared/hooks/useIsPageVisible';

import type { HistoryItem } from '../../types';

/**
 * Marks entries as read once they've actually been on screen, not merely
 * rendered: IntersectionObserver catches scroll-driven visibility, and
 * depending on page visibility re-runs the check when a tab regains focus
 * without any scroll happening at all.
 */
export function useVisibleEntriesObserver(
  containerRef: RefObject<HTMLDivElement | null>,
  items: HistoryItem[],
  onVisible: (seq: string) => void,
) {
  const pageVisible = useIsPageVisible();

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !items.length || !pageVisible) return;
    const checkVisible = () => {
      const viewport = container.getBoundingClientRect();
      container.querySelectorAll<HTMLElement>('[data-seq]').forEach((row) => {
        const bounds = row.getBoundingClientRect();
        const overlap =
          Math.min(bounds.bottom, viewport.bottom) - Math.max(bounds.top, viewport.top);
        if (overlap >= Math.min(bounds.height, viewport.height) * 0.5 && row.dataset.seq)
          onVisible(row.dataset.seq);
      });
    };
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const seq = (entry.target as HTMLElement).dataset.seq;
            if (seq) onVisible(seq);
          }
        }
      },
      { root: container, threshold: 0.5 },
    );
    container.querySelectorAll('[data-seq]').forEach((row) => observer.observe(row));
    checkVisible();
    return () => observer.disconnect();
  }, [items, onVisible, containerRef, pageVisible]);
}
