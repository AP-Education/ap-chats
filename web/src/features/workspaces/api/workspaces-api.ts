import { apiRequest, jsonInit } from '@/shared/api/http';

import type { CreateWorkspaceInput, UpdateWorkspaceInput, UploadedFile, Workspace } from '../types';

export function listWorkspaces(token: string): Promise<Workspace[]> {
  return apiRequest('/api/workspaces', token);
}

export function createWorkspace(token: string, input: CreateWorkspaceInput): Promise<Workspace> {
  return apiRequest('/api/workspaces', token, jsonInit('POST', input));
}

export function updateWorkspace(
  token: string,
  workspaceId: string,
  input: UpdateWorkspaceInput,
): Promise<Workspace> {
  return apiRequest(`/api/workspaces/${workspaceId}`, token, jsonInit('PATCH', input));
}

export function uploadFile(token: string, file: File): Promise<UploadedFile> {
  const formData = new FormData();
  formData.append('file', file);
  return apiRequest('/api/uploads', token, { method: 'POST', body: formData });
}
