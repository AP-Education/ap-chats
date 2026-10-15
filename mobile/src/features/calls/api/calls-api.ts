import { authorizedFetch } from '../../auth';
import type { CallJoinGrant } from '../types';

const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

export interface LiveCall {
  id: string;
  status: string;
  answeredAt: string | null;
}

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

async function post<T>(path: string, signal?: AbortSignal): Promise<T> {
  if (!apiUrl) throw new CallsApiError(0, 'EXPO_PUBLIC_API_URL is not set');
  const response = await authorizedFetch(`${apiUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
    signal,
  });
  if (!response.ok)
    throw new CallsApiError(response.status, `POST ${path} failed: ${response.status}`);
  return (await response.json()) as T;
}

// Ported from web/src/features/calls/api/calls-api.ts — same endpoints, called
// directly with the native auth token instead of through the WebView.
/** Joining answers the call for everyone, so it is never sent once the answer was given up. */
export function joinCall(
  workspaceId: string,
  channelId: string,
  callId: string,
  signal?: AbortSignal,
): Promise<CallJoinGrant> {
  return post(`${basePath(workspaceId, channelId)}/${callId}/token`, signal);
}

export function declineCall(
  workspaceId: string,
  channelId: string,
  callId: string,
): Promise<{ ok: true }> {
  return post(`${basePath(workspaceId, channelId)}/${callId}/decline`);
}

export function leaveCall(
  workspaceId: string,
  channelId: string,
  callId: string,
): Promise<{ ok: true }> {
  return post(`${basePath(workspaceId, channelId)}/${callId}/leave`);
}

export async function activeCall(workspaceId: string, channelId: string): Promise<LiveCall | null> {
  if (!apiUrl) throw new CallsApiError(0, 'EXPO_PUBLIC_API_URL is not set');
  const response = await authorizedFetch(`${apiUrl}${basePath(workspaceId, channelId)}/active`);
  if (!response.ok)
    throw new CallsApiError(response.status, `GET active call failed: ${response.status}`);
  return response.json() as Promise<LiveCall | null>;
}
