import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useSocketEvent } from '@/features/realtime/hooks/useSocketEvent';
import { useConversationScope } from '@/features/social/conversation-scope/store';

import { listScheduled } from '../api/scheduled-messages-api';
import { schedulingQueryKeys } from '../queryKeys';
import type { SchedulingServerToClientEvents } from '../types';

/** The viewer's own schedule for the open conversation, refreshed whenever one of their devices changes it. */
export function useScheduledMessages() {
  const { workspaceId, channelId } = useConversationScope();
  const { token, identity } = useQueryAuth();
  const queryClient = useQueryClient();
  const queryKey = schedulingQueryKeys.channel(identity, workspaceId, channelId);

  useSocketEvent<SchedulingServerToClientEvents>('social:scheduled', (event) => {
    const isThisConversation = event.workspaceId === workspaceId && event.channelId === channelId;
    if (isThisConversation) void queryClient.invalidateQueries({ queryKey });
  });

  return useQuery({
    queryKey,
    queryFn: () => listScheduled(token as string, workspaceId, channelId),
    enabled: Boolean(token),
  });
}
