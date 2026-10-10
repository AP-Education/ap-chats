import type { InfiniteData } from '@tanstack/react-query';

import type { PageCursor } from '../messaging/hooks/useMessageHistory';
import { type HistoryPage, isMessageItem } from '../messaging/types';
import { MAX_FACES } from './reaction-display';
import type { MessageReaction, ReactionSummary } from './types';

export type HistoryData = InfiniteData<HistoryPage, PageCursor>;

/** A reaction's new state; `reacted` only when the change was the viewer's own. */
export type ReactionChange = ReactionSummary & { reacted?: boolean };

/** What the viewer's own tap does to a chip, shown before the server answers. */
export function toggledReaction(
  current: MessageReaction | undefined,
  emoji: string,
  viewerMemberId: string,
): MessageReaction {
  const reacted = !current?.reacted;
  const count = (current?.count ?? 0) + (reacted ? 1 : -1);
  const others = (current?.recentMemberIds ?? []).filter((id) => id !== viewerMemberId);
  const recentMemberIds = reacted ? [viewerMemberId, ...others].slice(0, MAX_FACES) : others;

  return { emoji, count, recentMemberIds, reacted };
}

/** A new chip goes last and an emptied one disappears, so chips keep the order they first appeared in. */
export function applyReactionChange(
  reactions: MessageReaction[],
  change: ReactionChange,
): MessageReaction[] {
  if (change.count <= 0) return reactions.filter((reaction) => reaction.emoji !== change.emoji);

  const current = reactions.find((reaction) => reaction.emoji === change.emoji);
  const next = { ...change, reacted: change.reacted ?? current?.reacted ?? false };
  if (!current) return [...reactions, next];

  return reactions.map((reaction) => (reaction === current ? next : reaction));
}

export function withReactionChange(
  history: HistoryData,
  messageId: string,
  change: ReactionChange,
): HistoryData {
  const pages = history.pages.map((page) => {
    const holdsMessage = page.items.some((item) => item.id === messageId);
    if (!holdsMessage) return page;

    const items = page.items.map((item) =>
      item.id === messageId && isMessageItem(item)
        ? { ...item, reactions: applyReactionChange(item.reactions ?? [], change) }
        : item,
    );
    return { ...page, items };
  });

  return { ...history, pages };
}
