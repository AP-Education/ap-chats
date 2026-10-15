import type { Message } from '@/features/social/messaging/types';
import { apiRequest, jsonInit } from '@/shared/api/http';

import type { ScheduledMessage, ScheduleMessageCommand } from '../types';

function scheduledUrl(workspaceId: string, channelId: string) {
  return `/api/workspaces/${workspaceId}/channels/${channelId}/scheduled-messages`;
}

export function listScheduled(
  token: string,
  workspaceId: string,
  channelId: string,
): Promise<ScheduledMessage[]> {
  return apiRequest(scheduledUrl(workspaceId, channelId), token);
}

export function scheduleMessage(
  token: string,
  workspaceId: string,
  channelId: string,
  input: ScheduleMessageCommand & { clientNonce: string; sendAt: Date },
): Promise<ScheduledMessage> {
  const payload = {
    markdown: input.markdown,
    clientNonce: input.clientNonce,
    sendAt: input.sendAt,
    replyToMessageId: input.replyToMessageId,
    quoteText: input.quoteText,
  };
  return apiRequest(scheduledUrl(workspaceId, channelId), token, jsonInit('POST', payload));
}

export function rescheduleMessage(
  token: string,
  workspaceId: string,
  channelId: string,
  message: ScheduledMessage,
  sendAt: Date,
): Promise<ScheduledMessage> {
  return apiRequest(
    `${scheduledUrl(workspaceId, channelId)}/${message.id}`,
    token,
    jsonInit('PATCH', { sendAt, revision: message.revision }),
  );
}

export function sendScheduledNow(
  token: string,
  workspaceId: string,
  channelId: string,
  message: ScheduledMessage,
): Promise<Message> {
  return apiRequest(`${scheduledUrl(workspaceId, channelId)}/${message.id}/send`, token, {
    method: 'POST',
  });
}

export function cancelScheduled(
  token: string,
  workspaceId: string,
  channelId: string,
  message: ScheduledMessage,
): Promise<void> {
  return apiRequest(`${scheduledUrl(workspaceId, channelId)}/${message.id}`, token, {
    method: 'DELETE',
  });
}
