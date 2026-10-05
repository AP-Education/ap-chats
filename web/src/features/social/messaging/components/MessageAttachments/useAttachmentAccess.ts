import { useQuery } from '@tanstack/react-query';
import { message } from 'antd';
import { useEffect, useState } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useConversationScope } from '@/features/social/conversation/store';

import { attachmentUrl } from '../../attachments/attachments-api';
import type { Attachment } from '../../attachments/types';

export function useAttachmentUrl(
  messageId: string,
  attachmentId: string,
  variant: 'thumbnail' | 'preview',
  enabled: boolean,
) {
  const { token, identity } = useQueryAuth();
  const scope = useConversationScope();
  return useQuery({
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
    enabled: Boolean(enabled && token),
    staleTime: 10 * 60_000,
    gcTime: 15 * 60_000,
    retry: 1,
  });
}

export function useAttachmentDownload(messageId: string, attachment: Attachment) {
  const { token } = useQueryAuth();
  const scope = useConversationScope();
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
      void message.error('Не вдалося завантажити файл. Можливо, доступ до повідомлення змінився.');
    } finally {
      setDownloading(false);
    }
  }

  return { downloading, download };
}

export function useVisibleAttachment() {
  const [element, setElement] = useState<HTMLButtonElement | null>(null);
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
