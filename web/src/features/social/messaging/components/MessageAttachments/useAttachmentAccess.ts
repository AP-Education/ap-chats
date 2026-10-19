import { queryOptions, useQuery } from '@tanstack/react-query';
import { message } from 'antd';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useConversationScope } from '@/features/social/conversation-scope/store';

import { attachmentUrl } from '../../attachments/attachments-api';
import type { Attachment, UploadScope } from '../../attachments/types';

export type AttachmentUrlVariant = 'thumbnail' | 'preview';

/** A signed address of an attachment, shared by the rows and the viewer through one cache entry. */
export function attachmentUrlQuery(
  { token, identity }: ReturnType<typeof useQueryAuth>,
  scope: UploadScope,
  messageId: string,
  attachmentId: string,
  variant: AttachmentUrlVariant,
) {
  return queryOptions({
    queryKey: [
      'attachment-url',
      identity,
      scope.workspaceId,
      scope.channelId,
      messageId,
      attachmentId,
      variant,
    ],
    queryFn: () => attachmentUrl(token!, scope, messageId, attachmentId, variant),
    // Signed addresses live 15 minutes; one is reused well before it runs out.
    staleTime: 10 * 60_000,
    gcTime: 15 * 60_000,
    retry: 1,
  });
}

export function useAttachmentUrl(
  messageId: string,
  attachmentId: string,
  variant: AttachmentUrlVariant,
  enabled: boolean,
) {
  const auth = useQueryAuth();
  const scope = useConversationScope();
  return useQuery({
    ...attachmentUrlQuery(auth, scope, messageId, attachmentId, variant),
    enabled: Boolean(enabled && auth.token),
  });
}

export function useAttachmentDownload(messageId: string, attachment: Attachment) {
  const { token } = useQueryAuth();
  const scope = useConversationScope();
  const { t } = useTranslation('messaging');
  const [downloading, setDownloading] = useState(false);

  async function download() {
    if (!token || downloading) return;
    setDownloading(true);
    try {
      const { url } = await attachmentUrl(token, scope, messageId, attachment.id, 'download');
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.name;
      link.rel = 'noopener noreferrer';
      link.referrerPolicy = 'no-referrer';
      link.click();
    } catch {
      void message.error(t(($) => $.attachments.errors.downloadFailed));
    } finally {
      setDownloading(false);
    }
  }

  return { downloading, download };
}

export function useVisibleAttachment() {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);
  return { observeElement: setElement, visible };
}

/** A message's photo as shown: its address once it nears the screen, and a retry if it broke. */
export function useAttachmentImage(messageId: string, attachmentId: string, available: boolean) {
  const { observeElement, visible } = useVisibleAttachment();
  const access = useAttachmentUrl(messageId, attachmentId, 'thumbnail', available && visible);
  const [failed, setFailed] = useState(false);

  return {
    observeElement,
    src: access.data && !failed ? access.data.url : undefined,
    broken: failed || access.isError,
    markBroken: () => setFailed(true),
    retry: () => {
      setFailed(false);
      void access.refetch();
    },
  };
}
