import { apiRequest } from '@/shared/api/http';

export interface PinnedMessage {
  messageId: string;
  seq: string;
  pinnedAt: string;
  pinnedByMemberId: string;
  authorMemberId: string;
  author: { memberId: string; displayName: string | null; avatarPath: string | null };
  markdown: string;
}

function pinsUrl(workspaceId: string, channelId: string) {
  return `/api/workspaces/${workspaceId}/channels/${channelId}/pins`;
}

export function listPins(
  token: string,
  workspaceId: string,
  channelId: string,
): Promise<PinnedMessage[]> {
  return apiRequest(pinsUrl(workspaceId, channelId), token);
}

export function setPin(
  token: string,
  workspaceId: string,
  channelId: string,
  messageId: string,
  active: boolean,
) {
  return apiRequest<void>(`${pinsUrl(workspaceId, channelId)}/${messageId}`, token, {
    method: active ? 'PUT' : 'DELETE',
  });
}
