import { createTimeline } from '@ap-education/timeline';
import type { QueryClient } from '@tanstack/react-query';

import { confirmDirectMessage } from '@/features/social/direct-messages/cache';

import { getMessage } from '../../api/messages-api';
import { messagingQueryKeys } from '../../queryKeys';
import { toEntry } from '../../timeline/chat-entry';
import { createChatSource } from '../../timeline/chat-source';
import type { Message } from '../../types';
import type { ConversationKey } from '../types';

// Lands before the outbox lets the message go, so its row turns into the real one in place.
export async function recordSentMessage(
  queryClient: QueryClient,
  { identity, workspaceId, channelId }: ConversationKey,
  token: string,
  message: Message,
) {
  confirmDirectMessage(queryClient, identity, channelId, message);
  // The window lives in the cache, so a timeline opened here writes where the screen reads.
  const timeline = createTimeline({
    cache: queryClient,
    key: messagingQueryKeys.history(identity, workspaceId, channelId),
    source: createChatSource(token, workspaceId, channelId),
    anchor: { at: 'unread' },
  });

  try {
    const item = await queryClient.fetchQuery({
      queryKey: [
        ...messagingQueryKeys.channel(identity, workspaceId, channelId),
        'item',
        message.id,
      ],
      queryFn: () => getMessage(token, workspaceId, channelId, message.id),
      staleTime: 30_000,
    });
    await timeline.receive(toEntry(item));
  } catch {
    await timeline.refresh();
  }
}
