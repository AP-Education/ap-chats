import type { CallJoinGrant } from '../types';

const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

export class CallsApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function basePath(workspaceId: string, channelId: string): string {
  return `/api/workspaces/${workspaceId}/channels/${channelId}/calls`;
}

async function post<T>(accessToken: string, path: string): Promise<T> {
  if (!apiUrl) throw new CallsApiError(0, 'EXPO_PUBLIC_API_URL is not set');
  const response = await fetch(`${apiUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: '{}',
  });
  if (!response.ok)
    throw new CallsApiError(response.status, `POST ${path} failed: ${response.status}`);
  return (await response.json()) as T;
}

// Ported from web/src/features/calls/api/calls-api.ts — same endpoints, called
// directly with the native auth token instead of through the WebView.
export function joinCall(
  accessToken: string,
  workspaceId: string,
  channelId: string,
  callId: string,
): Promise<CallJoinGrant> {
  return post(accessToken, `${basePath(workspaceId, channelId)}/${callId}/token`);
}

export function declineCall(
  accessToken: string,
  workspaceId: string,
  channelId: string,
  callId: string,
): Promise<{ ok: true }> {
  return post(accessToken, `${basePath(workspaceId, channelId)}/${callId}/decline`);
}

export function leaveCall(
  accessToken: string,
  workspaceId: string,
  channelId: string,
  callId: string,
): Promise<{ ok: true }> {
  return post(accessToken, `${basePath(workspaceId, channelId)}/${callId}/leave`);
}
