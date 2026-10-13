import { apiRequest, jsonInit } from '@/shared/api/http';

import type { Channel, CreateChannelInput, UpdateChannelInput } from '../types';

/** `all` lists every channel of the workspace and is for its managers only. */
export type ChannelScope = 'mine' | 'all';

function channelUrl(workspaceId: string, channelId?: string): string {
  return `/api/workspaces/${workspaceId}/channels${channelId ? `/${channelId}` : ''}`;
}

export function listChannels(
  token: string,
  workspaceId: string,
  scope: ChannelScope = 'mine',
): Promise<Channel[]> {
  const query = scope === 'all' ? '?scope=all' : '';
  return apiRequest(`${channelUrl(workspaceId)}${query}`, token);
}

export function getChannel(
  token: string,
  workspaceId: string,
  channelId: string,
): Promise<Channel> {
  return apiRequest(channelUrl(workspaceId, channelId), token);
}

export function createChannel(
  token: string,
  workspaceId: string,
  input: CreateChannelInput,
): Promise<Channel> {
  return apiRequest(channelUrl(workspaceId), token, jsonInit('POST', input));
}

export function updateChannel(
  token: string,
  workspaceId: string,
  channelId: string,
  input: UpdateChannelInput,
): Promise<Channel> {
  return apiRequest(channelUrl(workspaceId, channelId), token, jsonInit('PATCH', input));
}

export function deleteChannel(
  token: string,
  workspaceId: string,
  channelId: string,
): Promise<void> {
  return apiRequest(channelUrl(workspaceId, channelId), token, { method: 'DELETE' });
}
