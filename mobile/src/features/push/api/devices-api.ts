import { fetchWithTimeout } from '../../../shared/api/fetch-with-timeout';
import { authorizedFetch } from '../../auth';
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

export async function registerDevice(payload: RegisterDevicePayload): Promise<void> {
  if (!apiUrl) return;
  const response = await authorizedFetch(`${apiUrl}/api/devices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new DevicesApiError(response.status, `POST /devices failed: ${response.status}`);
  }
}

/** By the key the phone registered with, not a session, which may already be gone. */
export async function releaseDevice(installationId: string, releaseKey: string): Promise<void> {
  if (!apiUrl) return;
  const response = await fetchWithTimeout(
    `${apiUrl}/api/devices/${encodeURIComponent(installationId)}/release`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ releaseKey }),
    },
  );
  if (!response.ok) {
    throw new DevicesApiError(response.status, `POST /devices/release failed: ${response.status}`);
  }
}
