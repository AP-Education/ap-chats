import type { CreateWorkspaceInput, UpdateWorkspaceInput, UploadedFile, Workspace } from '../types';

async function request<T>(url: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Workspaces request failed: ${response.status}`);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function listWorkspaces(token: string): Promise<Workspace[]> {
  return request('/api/workspaces', token);
}

export function createWorkspace(token: string, input: CreateWorkspaceInput): Promise<Workspace> {
  return request('/api/workspaces', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function updateWorkspace(
  token: string,
  workspaceId: string,
  input: UpdateWorkspaceInput,
): Promise<Workspace> {
  return request(`/api/workspaces/${workspaceId}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function uploadFile(token: string, file: File): Promise<UploadedFile> {
  const formData = new FormData();
  formData.append('file', file);
  return request('/api/uploads', token, { method: 'POST', body: formData });
}
