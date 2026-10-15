import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useConversationScope } from '@/features/social/conversation-scope/store';
import { attachmentUrlQuery } from '@/features/social/messaging/components/MessageAttachments/useAttachmentAccess';
import type { HistoryItem } from '@/features/social/messaging/types';

import { gallerySlides, slideIndexOf } from '../gallery';
import type { MediaGallery, MediaUrls, UrlVariant } from '../media-gallery';
import { conversationMedia } from '../media-list';
import type { HistoryEdge, PagedHistory } from '../types';

function loadEdge(history: PagedHistory, edge: HistoryEdge) {
  if (edge === 'older' && history.hasPreviousPage && !history.isFetchingPreviousPage) {
    void history.fetchPreviousPage();
  }
  if (edge === 'newer' && history.hasNextPage && !history.isFetchingNextPage) {
    void history.fetchNextPage();
  }
}

/**
 * The open gallery, if any, kept in step with the conversation's history. It opens from the tap
 * itself, so PhotoSwipe's zoom starts from the bubble the person touched.
 */
export function useMediaGallery(items: HistoryItem[], history: PagedHistory) {
  const queryClient = useQueryClient();
  const auth = useQueryAuth();
  const scope = useConversationScope();
  const [gallery, setGallery] = useState<MediaGallery | null>(null);
  const opening = useRef(false);

  const { hasPreviousPage: older, hasNextPage: newer } = history;
  const slides = useMemo(
    () => gallerySlides(conversationMedia(items), { older, newer }),
    [items, older, newer],
  );

  // Read by PhotoSwipe's callbacks long after the render that opened it.
  const latest = useRef({ slides, history, auth, scope });
  useLayoutEffect(() => {
    latest.current = { slides, history, auth, scope };
  });

  useEffect(() => {
    gallery?.update(slides);
  }, [gallery, slides]);

  useEffect(() => () => gallery?.dispose(), [gallery]);

  const open = useCallback(
    async (key: string) => {
      if (opening.current) return;
      opening.current = true;

      const urlQuery = (messageId: string, attachmentId: string, variant: UrlVariant) => {
        const { auth, scope } = latest.current;
        return attachmentUrlQuery(auth, scope, messageId, attachmentId, variant);
      };
      const urls: MediaUrls = {
        cached: (...args) => queryClient.getQueryData(urlQuery(...args).queryKey)?.url,
        fetch: async (...args) => (await queryClient.fetchQuery(urlQuery(...args))).url,
      };

      try {
        const { MediaGallery } = await import('../media-gallery');
        const { slides: openedSlides } = latest.current;
        const index = slideIndexOf(openedSlides, key);
        if (index < 0) return;

        const opened = new MediaGallery(openedSlides, index, urls, {
          onNearEdge: (edge) => loadEdge(latest.current.history, edge),
          onClosed: () => setGallery(null),
        });
        setGallery(opened);
      } finally {
        opening.current = false;
      }
    },
    [queryClient],
  );

  return { gallery, open };
}
