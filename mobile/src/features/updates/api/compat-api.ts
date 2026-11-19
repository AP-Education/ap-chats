import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { fetchWithTimeout } from '../../../shared/api/fetch-with-timeout';
import type { ShellCompat } from '../types';

const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
const STORAGE_KEY = 'ap-app.updates.compat';

function isCompat(value: unknown): value is ShellCompat {
  const compat = value as Partial<ShellCompat> | null;
  return (
    typeof compat === 'object' &&
    compat !== null &&
    (compat.minSupportedBuild === null || Number.isInteger(compat.minSupportedBuild)) &&
    (compat.storeUrl === null || typeof compat.storeUrl === 'string')
  );
}

/** Null on any failure: a short timeout, so a slow API never holds up the app. */
export async function fetchCompat(): Promise<ShellCompat | null> {
  if (!apiUrl || (Platform.OS !== 'ios' && Platform.OS !== 'android')) return null;
  try {
    const response = await fetchWithTimeout(
      `${apiUrl}/api/updates/compat?platform=${Platform.OS}`,
      { headers: { accept: 'application/json' } },
      3000,
    );
    if (!response.ok) return null;
    const body: unknown = await response.json();
    if (!isCompat(body)) return null;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(body)).catch(() => {});
    return body;
  } catch {
    return null;
  }
}

export async function loadRememberedCompat(): Promise<ShellCompat | null> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed: unknown = stored ? JSON.parse(stored) : null;
    return isCompat(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
