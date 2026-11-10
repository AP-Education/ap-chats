import {
  downloadFile,
  type MediaUrls,
  type MediaVariant,
  useMediaUrl,
  useNearScreen,
} from '@ap-education/ui/media';
import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { useMemo, useState } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useConversationScope } from '@/features/social/conversation-scope/store';

import { attachmentUrl } from '../../attachments/attachments-api';
import type { Attachment, UploadScope } from '../../attachments/types';
import type { AttachmentMedia, ChatMedia } from '../../message-media';
import { attachmentUrls, freshFor } from './attachment-urls';

/** A signed address of an attachment, shared by the rows and the viewer through one cache entry. */
export function attachmentUrlQuery(
  { token, identity }: { token: string | undefined; identity: string | undefined },
  scope: UploadScope,
  messageId: string,
  attachmentId: string,
  variant: MediaVariant,
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
    staleTime: freshFor(variant),
    gcTime: 15 * 60_000,
    retry: 1,
  });
}

/** The conversation's media addresses as the bubbles and the viewer ask for them. */
export function useAttachmentUrls(): MediaUrls<ChatMedia> {
  const queryClient = useQueryClient();
  const { token, identity } = useQueryAuth();
  const { workspaceId, channelId } = useConversationScope();

  return useMemo(
    () =>
      attachmentUrls(queryClient, ({ messageId, attachmentId }, variant) =>
        attachmentUrlQuery(
          { token, identity },
          { workspaceId, channelId },
          messageId,
          attachmentId,
          variant,
        ),
      ),
    [queryClient, token, identity, workspaceId, channelId],
  );
}

export function useAttachmentUrl(
  messageId: string,
  attachmentId: string,
  variant: MediaVariant,
  enabled: boolean,
) {
  const auth = useQueryAuth();
  const scope = useConversationScope();
  return useQuery({
    ...attachmentUrlQuery(auth, scope, messageId, attachmentId, variant),
    enabled: Boolean(enabled && auth.token),
  });
}

export function showDownloadError() {
  void message.error('Не вдалося завантажити файл. Можливо, доступ до повідомлення змінився.');
}

export function useAttachmentDownload(messageId: string, attachment: Attachment) {
  const queryClient = useQueryClient();
  const auth = useQueryAuth();
  const scope = useConversationScope();
  const [downloading, setDownloading] = useState(false);

  async function download() {
    if (!auth.token || downloading) return;
    setDownloading(true);
    try {
      const query = attachmentUrlQuery(auth, scope, messageId, attachment.id, 'download');
      const { url } = await queryClient.fetchQuery(query);
      downloadFile(url, attachment.name);
    } catch {
      showDownloadError();
    } finally {
      setDownloading(false);
    }
  }

  return { downloading, download };
}

/**
 * A message's photo as shown: by the link its message brought, else asked for once it nears the
 * screen. One that does not load asks once for a fresh link, as a link lapses while the chat stays
 * open; one that still breaks waits for a press.
 */
export function useAttachmentImage(media: AttachmentMedia, available: boolean) {
  const urls = useAttachmentUrls();
  const { observe, isNear } = useNearScreen();
  const address = useMediaUrl(urls, media, 'thumbnail', available && isNear);
  const [hasRetried, setRetried] = useState(false);
  const [hasBroken, setBroken] = useState(false);

  function fail() {
    if (hasRetried) {
      setBroken(true);
      return;
    }
    setRetried(true);
    address.retry();
  }

  function retry() {
    setBroken(false);
    address.retry();
  }

  return {
    observe,
    src: hasBroken ? undefined : address.url,
    broken: hasBroken || address.failed,
    fail,
    retry,
  };
}
