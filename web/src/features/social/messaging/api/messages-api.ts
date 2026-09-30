import { apiRequest, jsonInit } from '@/shared/api/http';

import type {
  CallHistoryItem,
  HistoryItem,
  HistoryPage,
  Message,
  MessageHistoryItem,
  SendMessageInput,
} from '../types';

export function messagesUrl(workspaceId: string, channelId: string) {
  return `/api/workspaces/${workspaceId}/channels/${channelId}/messages`;
}

export function openHistory(
  token: string,
  workspaceId: string,
  channelId: string,
  messageId?: string,
): Promise<HistoryPage> {
  const query = messageId ? `?messageId=${encodeURIComponent(messageId)}` : '';
  return apiRequest(`${messagesUrl(workspaceId, channelId)}/window${query}`, token);
}

export function historyPage(
  token: string,
  workspaceId: string,
  channelId: string,
  direction: 'before' | 'after',
  cursor: string,
  snapshot?: string,
): Promise<HistoryPage> {
  const params = new URLSearchParams({ [direction]: cursor });
  if (snapshot) params.set('snapshot', snapshot);
  return apiRequest(`${messagesUrl(workspaceId, channelId)}?${params}`, token);
}

export function sendMessage(
  token: string,
  workspaceId: string,
  channelId: string,
  input: SendMessageInput,
): Promise<Message> {
  return apiRequest(messagesUrl(workspaceId, channelId), token, jsonInit('POST', input));
}

// One route resolves either subject id (backend: HistoryFacade.entry()). The
// two typed wrappers below just assert the shape their callers already know
// they're asking for, since a message id can never resolve to a call row.
export function getEntry(
  token: string,
  workspaceId: string,
  channelId: string,
  entryId: string,
): Promise<HistoryItem> {
  return apiRequest(`${messagesUrl(workspaceId, channelId)}/${entryId}`, token);
}

export function getMessage(
  token: string,
  workspaceId: string,
  channelId: string,
  messageId: string,
): Promise<MessageHistoryItem> {
  return getEntry(token, workspaceId, channelId, messageId) as Promise<MessageHistoryItem>;
}

export function getCallEntry(
  token: string,
  workspaceId: string,
  channelId: string,
  callId: string,
): Promise<CallHistoryItem> {
  return getEntry(token, workspaceId, channelId, callId) as Promise<CallHistoryItem>;
}

export function editMessage(
  token: string,
  workspaceId: string,
  channelId: string,
  messageId: string,
  markdown: string,
  revision?: number,
): Promise<Message> {
  return apiRequest(
    `${messagesUrl(workspaceId, channelId)}/${messageId}`,
    token,
    jsonInit('PATCH', { markdown, ...(revision === undefined ? {} : { revision }) }),
  );
}

export function deleteMessages(
  token: string,
  workspaceId: string,
  channelId: string,
  messageIds: string[],
): Promise<{ deletedMessageIds: string[] }> {
  return apiRequest(
    `${messagesUrl(workspaceId, channelId)}/batch-delete`,
    token,
    jsonInit('POST', { messageIds }),
  );
}
