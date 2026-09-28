import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useSocketEvent } from '@/features/realtime/hooks/useSocketEvent';
import { unreadDirectMessagesKey } from '@/features/social/read-state/queryKeys';
import { useWorkspaceMemberLabels } from '@/features/workspaces/hooks/useWorkspaceMemberLabels';

import { listUnreadDirectMessages } from '../api/direct-messages-api';

export function useUnreadDirectMessages(workspaceId: string) {
  const { token, identity } = useQueryAuth();
  const { currentMember } = useWorkspaceMemberLabels(workspaceId);
  const queryClient = useQueryClient();
  const queryKey = unreadDirectMessagesKey(identity, workspaceId);

  useSocketEvent('social:unread', (event) => {
    if (
      (event.type === 'social.message.created' || event.type === 'social.forward.batch-created') &&
      event.actorMemberId === currentMember?.id
    )
      return;
    if (event.workspaceId === workspaceId)
      void queryClient.invalidateQueries({ queryKey, exact: true });
  });

  return useQuery({
    queryKey,
    queryFn: () => listUnreadDirectMessages(token as string, workspaceId),
    enabled: Boolean(token),
    refetchInterval: 30_000,
  });
}
