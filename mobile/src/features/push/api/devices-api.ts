import type { RegisterDevicePayload } from '../types';

const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

export class DevicesApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function registerDevice(
  accessToken: string,
  payload: RegisterDevicePayload,
): Promise<void> {
  if (!apiUrl) return;
  const response = await fetch(`${apiUrl}/api/devices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new DevicesApiError(response.status, `POST /devices failed: ${response.status}`);
  }
}

export async function unregisterDevice(accessToken: string, installationId: string): Promise<void> {
  if (!apiUrl) return;
  const response = await fetch(`${apiUrl}/api/devices/${encodeURIComponent(installationId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new DevicesApiError(response.status, `DELETE /devices failed: ${response.status}`);
  }
}
