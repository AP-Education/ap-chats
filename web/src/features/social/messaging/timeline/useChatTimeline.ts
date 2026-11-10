import { createTimeline, type TimelineAnchor, type TimelineCache } from '@ap-education/timeline';
import { useTimeline } from '@ap-education/timeline/react';
import { useMemo } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';

import { messagingQueryKeys } from '../queryKeys';
import { createChatSource } from './chat-source';
import { useChatFeed } from './useChatFeed';

const UNREAD: TimelineAnchor = { at: 'unread' };

function anchorAt(messageId: string | undefined): TimelineAnchor {
  return messageId ? { at: 'entry', key: messageId } : UNREAD;
}

/** A conversation's history window, opened where reading stopped or at a linked message. */
export function useChatTimeline(workspaceId: string, channelId: string, messageId?: string) {
  const { token, identity } = useQueryAuth();
  const key = useMemo(
    () => messagingQueryKeys.history(identity, workspaceId, channelId, messageId),
    [identity, workspaceId, channelId, messageId],
  );
  const source = useMemo(
    () => createChatSource(token ?? '', workspaceId, channelId),
    [token, workspaceId, channelId],
  );
  const anchor = useMemo(() => anchorAt(messageId), [messageId]);
  const feed = useChatFeed(workspaceId, channelId);

  return useTimeline({ key, source, anchor, feed, enabled: Boolean(token) });
}

/** Reads a conversation's window into the cache ahead of opening it, as the timeline would. */
export function readChatWindow(
  cache: TimelineCache,
  identity: string | undefined,
  token: string,
  workspaceId: string,
  channelId: string,
) {
  const key = messagingQueryKeys.history(identity, workspaceId, channelId);
  const source = createChatSource(token, workspaceId, channelId);
  const timeline = createTimeline({ cache, key, source, anchor: UNREAD });
  return { queryKey: key, queryFn: timeline.read };
}
