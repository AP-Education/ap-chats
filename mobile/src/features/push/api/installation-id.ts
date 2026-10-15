import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import { READABLE_WHEN_LOCKED } from '../../../shared/api/secure-store-access';

const KEY = 'ap-app.installation-id';
const RELEASE_KEY = 'ap-app.device-release-key';

export async function getInstallationId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(KEY);
  if (existing) return existing;
  const id = Crypto.randomUUID();
  await SecureStore.setItemAsync(KEY, id, READABLE_WHEN_LOCKED);
  return id;
}

/** The phone's own proof for taking itself off pushes, kept apart from any session. */
export async function getDeviceReleaseKey(): Promise<string> {
  const existing = await SecureStore.getItemAsync(RELEASE_KEY);
  if (existing) return existing;
  const key = toHex(Crypto.getRandomBytes(32));
  await SecureStore.setItemAsync(RELEASE_KEY, key, READABLE_WHEN_LOCKED);
  return key;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
