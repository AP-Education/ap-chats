import { useQueryClient } from '@tanstack/react-query';
import { message as toast } from 'antd';
import { useCallback } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useConversationScope } from '@/features/social/conversation/store';
import { getMessage } from '@/features/social/messaging/api/messages-api';
import { mergeHistoryItem } from '@/features/social/messaging/history-cache';
import type { MessageHistoryItem } from '@/features/social/messaging/types';
import { ApiError } from '@/shared/api/http';

import { setReaction } from '../api/reactions-api';
import { recordReaction } from '../quick-reactions';
import { patchMessageReactions, type ReactionChange, toggledReaction } from '../reaction-cache';

/** Adds the viewer's reaction, or takes it back when they already reacted with that emoji. */
export function useReactionToggle(viewerMemberId: string | undefined) {
  const { workspaceId, channelId } = useConversationScope();
  const { token, identity } = useQueryAuth();
  const queryClient = useQueryClient();

  return useCallback(
    (item: MessageHistoryItem, emoji: string) => {
      if (!token || !viewerMemberId) return;
      const messageId = item.message.id;
      const current = item.reactions?.find((reaction) => reaction.emoji === emoji);
      const optimistic = toggledReaction(current, emoji, viewerMemberId);
      const patch = (change: ReactionChange) =>
        patchMessageReactions(queryClient, identity, workspaceId, channelId, messageId, change);

      if (optimistic.reacted) recordReaction(emoji);
      patch(optimistic);
      const active = Boolean(optimistic.reacted);
      setReaction(token, workspaceId, channelId, messageId, emoji, active).then(patch, (error) => {
        toast.error(
          error instanceof ApiError && error.status === 409
            ? 'Тут уже забагато різних реакцій.'
            : 'Не вдалося змінити реакцію.',
        );
        void getMessage(token, workspaceId, channelId, messageId).then(
          (fresh) => mergeHistoryItem(queryClient, identity, workspaceId, channelId, fresh),
          () => undefined,
        );
      });
    },
    [token, identity, queryClient, workspaceId, channelId, viewerMemberId],
  );
}
