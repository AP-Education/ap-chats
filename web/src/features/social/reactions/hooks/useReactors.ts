import { useQuery } from '@tanstack/react-query';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useConversationScope } from '@/features/social/conversation/store';

import { listReactors } from '../api/reactions-api';

/** The people behind a message's reactions; read again once the expected count moves. */
export function useReactors(messageId: string, emoji: string | undefined, expected: number) {
  const { workspaceId, channelId } = useConversationScope();
  const { token, identity } = useQueryAuth();
  const target = { workspaceId, channelId, messageId };

  return useQuery({
    queryKey: ['reactions', identity, workspaceId, channelId, messageId, emoji, expected],
    queryFn: () => listReactors(token as string, target, emoji),
    enabled: Boolean(token),
    staleTime: 30_000,
  });
}
