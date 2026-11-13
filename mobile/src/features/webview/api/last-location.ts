import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'ap-app:last-location';

/** The page the person last had open, if it still belongs to the given app origin. */
export async function loadLastLocation(appUrl: string): Promise<string | null> {
  try {
    const stored = await AsyncStorage.getItem(KEY);
    return stored && sameOrigin(stored, appUrl) ? stored : null;
  } catch {
    return null;
  }
}

export function rememberLocation(
  { url, loading }: { url: string; loading: boolean },
  appUrl: string,
): void {
  const isAppPage = !loading && sameOrigin(url, appUrl);
  if (isAppPage) void AsyncStorage.setItem(KEY, url).catch(() => undefined);
}

export function forgetLastLocation(): void {
  void AsyncStorage.removeItem(KEY).catch(() => undefined);
}

function sameOrigin(url: string, appUrl: string): boolean {
  try {
    return new URL(url).origin === new URL(appUrl).origin;
  } catch {
    return false;
  }
}
