import type { InfiniteData, QueryClient } from '@tanstack/react-query';

import type { PageCursor } from '../messaging/hooks/useMessageHistory';
import { messagingQueryKeys } from '../messaging/queryKeys';
import { type HistoryPage, isMessageItem } from '../messaging/types';
import type { MessageReaction } from './types';

export interface ReactionChange {
  emoji: string;
  count: number;
  recentMemberIds: string[];
  /** Left out when someone else reacted, so the viewer's own mark stays as it was. */
  reacted?: boolean;
}

/** The viewer's own toggle, shown before the server answers. */
export function toggledReaction(
  current: MessageReaction | undefined,
  emoji: string,
  viewerMemberId: string,
): ReactionChange {
  const reacted = !current?.reacted;
  const others = (current?.recentMemberIds ?? []).filter((id) => id !== viewerMemberId);
  return {
    emoji,
    count: (current?.count ?? 0) + (reacted ? 1 : -1),
    recentMemberIds: reacted ? [viewerMemberId, ...others].slice(0, 3) : others,
    reacted,
  };
}

/** A new chip goes last and an emptied one disappears, so chips keep the order they first appeared in. */
export function applyReactionChange(
  reactions: MessageReaction[],
  change: ReactionChange,
): MessageReaction[] {
  if (change.count <= 0) return reactions.filter((reaction) => reaction.emoji !== change.emoji);

  const current = reactions.find((reaction) => reaction.emoji === change.emoji);
  const next = {
    emoji: change.emoji,
    count: change.count,
    recentMemberIds: change.recentMemberIds,
    reacted: change.reacted ?? current?.reacted ?? false,
  };
  if (!current) return [...reactions, next];
  return reactions.map((reaction) => (reaction === current ? next : reaction));
}

export function patchMessageReactions(
  queryClient: QueryClient,
  identity: string | undefined,
  workspaceId: string,
  channelId: string,
  messageId: string,
  change: ReactionChange,
) {
  queryClient.setQueriesData<InfiniteData<HistoryPage, PageCursor>>(
    { queryKey: messagingQueryKeys.histories(identity, workspaceId, channelId) },
    (current) =>
      current && {
        ...current,
        pages: current.pages.map((page) =>
          page.items.some((item) => item.id === messageId)
            ? {
                ...page,
                items: page.items.map((item) =>
                  item.id === messageId && isMessageItem(item)
                    ? { ...item, reactions: applyReactionChange(item.reactions ?? [], change) }
                    : item,
                ),
              }
            : page,
        ),
      },
  );
}
