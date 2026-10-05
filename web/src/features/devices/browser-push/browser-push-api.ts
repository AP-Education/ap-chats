import { apiRequest, jsonInit } from '@/shared/api/http';

const base = '/api/devices/web';
export function pushConfiguration(token: string) {
  return apiRequest<{ publicKey: string | null }>(`${base}/config`, token);
}
export function registerSubscription(token: string, subscription: PushSubscription) {
  return apiRequest<{ id: string }>(base, token, {
    ...jsonInit('POST', { ...subscription.toJSON(), installationId: browserInstallationId() }),
    signal: AbortSignal.timeout(10000),
  });
}
export function removeSubscription(token: string, id: string) {
  return apiRequest<void>(`${base}/${id}`, token, {
    method: 'DELETE',
    keepalive: true,
    signal: AbortSignal.timeout(5000),
  });
}
export function updatePresence(
  token: string,
  id: string,
  presence: { focused: boolean; workspaceId?: string; channelId?: string },
) {
  return apiRequest<void>(`${base}/${id}/presence`, token, {
    ...jsonInit('PATCH', presence),
    signal: AbortSignal.timeout(5000),
  });
}

function browserInstallationId(): string {
  const key = 'ap:browser-installation';
  const previous = localStorage.getItem(key);
  if (previous) return previous;
  const id = crypto.randomUUID();
  localStorage.setItem(key, id);
  return id;
}
