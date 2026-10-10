import { messagesUrl } from '@/features/social/messaging/api/messages-api';
import { apiRequest, jsonInit } from '@/shared/api/http';

import type { MessageReaction, Reactor } from '../types';

interface ReactionTarget {
  workspaceId: string;
  channelId: string;
  messageId: string;
}

function reactionsUrl({ workspaceId, channelId, messageId }: ReactionTarget, emoji?: string) {
  const query = emoji ? `?emoji=${encodeURIComponent(emoji)}` : '';
  return `${messagesUrl(workspaceId, channelId)}/${messageId}/reactions${query}`;
}

export function addReaction(
  token: string,
  target: ReactionTarget,
  emoji: string,
): Promise<MessageReaction> {
  return apiRequest(reactionsUrl(target), token, jsonInit('POST', { emoji }));
}

export function removeReaction(
  token: string,
  target: ReactionTarget,
  emoji: string,
): Promise<MessageReaction> {
  return apiRequest(reactionsUrl(target, emoji), token, { method: 'DELETE' });
}

export function listReactors(
  token: string,
  target: ReactionTarget,
  emoji: string | undefined,
): Promise<Reactor[]> {
  return apiRequest(reactionsUrl(target, emoji), token);
}
