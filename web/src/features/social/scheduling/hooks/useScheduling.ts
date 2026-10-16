import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useConversationScope } from '@/features/social/conversation-scope/store';
import { randomId } from '@/shared/lib/random-id';

import {
  cancelScheduled,
  rescheduleMessage,
  scheduleMessage,
  sendScheduledNow,
} from '../api/scheduled-messages-api';
import { schedulingQueryKeys } from '../queryKeys';
import type { ScheduledMessage, ScheduleMessageCommand } from '../types';

interface Schedule {
  input: ScheduleMessageCommand;
  sendAt: Date;
}

interface Reschedule {
  message: ScheduledMessage;
  sendAt: Date;
}

/** Everything the author does with the open conversation's schedule. */
export function useScheduling() {
  const { workspaceId, channelId } = useConversationScope();
  const { token, identity } = useQueryAuth();
  const queryClient = useQueryClient();
  const queryKey = schedulingQueryKeys.channel(identity, workspaceId, channelId);
  const refresh = () => queryClient.invalidateQueries({ queryKey });

  const schedule = useMutation({
    mutationFn: ({ input, sendAt }: Schedule) =>
      scheduleMessage(token as string, workspaceId, channelId, {
        ...input,
        clientNonce: randomId(),
        sendAt,
      }),
    onSuccess: refresh,
  });

  const reschedule = useMutation({
    mutationFn: ({ message, sendAt }: Reschedule) =>
      rescheduleMessage(token as string, workspaceId, channelId, message, sendAt),
    onSettled: refresh,
  });

  // The message itself reaches the history through the channel's own events.
  const sendNow = useMutation({
    mutationFn: (message: ScheduledMessage) =>
      sendScheduledNow(token as string, workspaceId, channelId, message),
    onSettled: refresh,
  });

  const cancel = useMutation({
    mutationFn: (message: ScheduledMessage) =>
      cancelScheduled(token as string, workspaceId, channelId, message),
    onSettled: refresh,
  });

  return { schedule, reschedule, sendNow, cancel };
}
