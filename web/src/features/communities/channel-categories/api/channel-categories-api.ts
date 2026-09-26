import { apiRequest, jsonInit } from '@/shared/api/http';

import type {
  ChannelCategory,
  CreateChannelCategoryInput,
  UpdateChannelCategoryInput,
} from '../types';

export function listChannelCategories(
  token: string,
  workspaceId: string,
): Promise<ChannelCategory[]> {
  return apiRequest(`/api/workspaces/${workspaceId}/channel-categories`, token);
}

export function createChannelCategory(
  token: string,
  workspaceId: string,
  input: CreateChannelCategoryInput,
): Promise<ChannelCategory> {
  return apiRequest(
    `/api/workspaces/${workspaceId}/channel-categories`,
    token,
    jsonInit('POST', input),
  );
}

export function updateChannelCategory(
  token: string,
  workspaceId: string,
  categoryId: string,
  input: UpdateChannelCategoryInput,
): Promise<ChannelCategory> {
  return apiRequest(
    `/api/workspaces/${workspaceId}/channel-categories/${categoryId}`,
    token,
    jsonInit('PATCH', input),
  );
}

export function deleteChannelCategory(
  token: string,
  workspaceId: string,
  categoryId: string,
): Promise<void> {
  return apiRequest(`/api/workspaces/${workspaceId}/channel-categories/${categoryId}`, token, {
    method: 'DELETE',
  });
}
