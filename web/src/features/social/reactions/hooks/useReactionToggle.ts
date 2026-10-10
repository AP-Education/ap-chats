import { useMutation } from '@tanstack/react-query';
import { message as toast } from 'antd';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useConversationScope } from '@/features/social/conversation/store';
import type { MessageHistoryItem } from '@/features/social/messaging/types';
import { ApiError } from '@/shared/api/http';

import { addReaction, removeReaction } from '../api/reactions-api';
import { recordReaction } from '../quick-reactions';
import { toggledReaction } from '../reaction-cache';
import type { MessageReaction } from '../types';
import { useReactionCache } from './useReactionCache';

interface Toggle {
  messageId: string;
  previous: MessageReaction;
  next: MessageReaction;
}

/** Adds the viewer's reaction, or takes it back when they already reacted with that emoji. */
export function useReactionToggle(viewerMemberId: string | undefined) {
  const { workspaceId, channelId } = useConversationScope();
  const { token } = useQueryAuth();
  const applyChange = useReactionCache();

  const toggle = useMutation({
    mutationFn: ({ messageId, next }: Toggle) => {
      const target = { workspaceId, channelId, messageId };
      const send = next.reacted ? addReaction : removeReaction;
      return send(token as string, target, next.emoji);
    },
    onMutate: ({ messageId, next }) => {
      if (next.reacted) recordReaction(next.emoji);
      applyChange(messageId, next);
    },
    onSuccess: (confirmed, { messageId }) => applyChange(messageId, confirmed),
    onError: (error, { messageId, previous }) => {
      toast.error(failureMessage(error));
      applyChange(messageId, previous);
    },
  });

  return (item: MessageHistoryItem, emoji: string) => {
    if (!token || !viewerMemberId) return;

    const current = item.reactions?.find((reaction) => reaction.emoji === emoji);
    const previous = current ?? { emoji, count: 0, recentMemberIds: [], reacted: false };
    const next = toggledReaction(current, emoji, viewerMemberId);
    toggle.mutate({ messageId: item.message.id, previous, next });
  };
}

function failureMessage(error: unknown) {
  const isFull = error instanceof ApiError && error.status === 409;
  return isFull ? 'Тут уже забагато різних реакцій.' : 'Не вдалося змінити реакцію.';
}
