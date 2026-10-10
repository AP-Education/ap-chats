import { messagesUrl } from '@/features/social/messaging/api/messages-api';
import { apiRequest } from '@/shared/api/http';

import type { MessageReaction, Reactor } from '../types';

function reactionsUrl(workspaceId: string, channelId: string, messageId: string) {
  return `${messagesUrl(workspaceId, channelId)}/${messageId}/reactions`;
}

export function setReaction(
  token: string,
  workspaceId: string,
  channelId: string,
  messageId: string,
  emoji: string,
  active: boolean,
): Promise<MessageReaction> {
  const url = `${reactionsUrl(workspaceId, channelId, messageId)}/${encodeURIComponent(emoji)}`;
  return apiRequest(url, token, { method: active ? 'PUT' : 'DELETE' });
}

export function listReactors(
  token: string,
  workspaceId: string,
  channelId: string,
  messageId: string,
  emoji?: string,
): Promise<Reactor[]> {
  const query = emoji ? `?emoji=${encodeURIComponent(emoji)}` : '';
  return apiRequest(`${reactionsUrl(workspaceId, channelId, messageId)}${query}`, token);
}
