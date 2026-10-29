import { useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useConversationScope } from '@/features/social/conversation-scope/store';
import { attachmentUrlQuery } from '@/features/social/messaging/components/MessageAttachments/useAttachmentAccess';
import type { HistoryItem } from '@/features/social/messaging/types';

import type { MediaGallery, MediaUrls, UrlVariant } from '../media-gallery';
import { conversationMedia } from '../media-list';

/**
 * The open gallery, if any, over the media the chat has loaded. It opens from the tap itself, so
 * PhotoSwipe's zoom starts from the bubble the person touched.
 */
export function useMediaGallery(items: HistoryItem[]) {
  const queryClient = useQueryClient();
  const auth = useQueryAuth();
  const scope = useConversationScope();
  const [gallery, setGallery] = useState<MediaGallery | null>(null);
  const opening = useRef(false);
  const mounted = useRef(false);
  // The imperative gallery can exist before React commits its state update.
  const ownedGallery = useRef<MediaGallery | null>(null);

  // Read by the tap and PhotoSwipe's callbacks long after the render that set them up.
  const latest = useRef({ items, auth, scope });
  useLayoutEffect(() => {
    latest.current = { items, auth, scope };
  });

  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      ownedGallery.current?.dispose();
      ownedGallery.current = null;
    };
  }, []);

  const open = useCallback(
    async (key: string) => {
      if (!mounted.current || opening.current || ownedGallery.current) return;
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
        if (!mounted.current) return;
        const media = conversationMedia(latest.current.items);
        const index = media.findIndex((entry) => entry.key === key);
        if (index < 0) return;

        const next = new MediaGallery(media, index, urls, {
          onClosed: () => {
            ownedGallery.current = null;
            if (mounted.current) setGallery(null);
          },
        });
        ownedGallery.current = next;
        setGallery(next);
      } catch {
        if (mounted.current)
          void message.error('Не вдалося відкрити медіа. Перевірте з’єднання та спробуйте ще раз.');
      } finally {
        opening.current = false;
      }
    },
    [queryClient],
  );

  return { gallery, open };
}
