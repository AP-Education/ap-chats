import { useQueryClient } from '@tanstack/react-query';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useSocketEvent } from '@/features/realtime/hooks/useSocketEvent';
import { useConversationScope } from '@/features/social/conversation/store';

import { patchMessageReactions } from '../reaction-cache';

export const REACTION_EVENT_PREFIX = 'social.reaction.';

type ReactionServerToClientEvents = {
  'social:changed': (payload: {
    type: string;
    workspaceId: string;
    channelId: string;
    messageId?: string;
    actorMemberId?: string;
    emoji?: string;
    count?: number;
    recentMemberIds?: string[];
  }) => void;
};

/** Reactions arrive with their new state, so the open conversation updates without a refetch. */
export function useReactionEvents(memberId: string | undefined) {
  const { workspaceId, channelId } = useConversationScope();
  const { identity } = useQueryAuth();
  const queryClient = useQueryClient();

  useSocketEvent<ReactionServerToClientEvents>('social:changed', (event) => {
    if (event.workspaceId !== workspaceId || event.channelId !== channelId) return;
    if (!event.type.startsWith(REACTION_EVENT_PREFIX)) return;
    const { messageId, emoji, count, recentMemberIds, actorMemberId } = event;
    if (!messageId || !emoji || count === undefined || !recentMemberIds) return;

    patchMessageReactions(queryClient, identity, workspaceId, channelId, messageId, {
      emoji,
      count,
      recentMemberIds,
      reacted: actorMemberId === memberId ? event.type === 'social.reaction.added' : undefined,
    });
  });
}
