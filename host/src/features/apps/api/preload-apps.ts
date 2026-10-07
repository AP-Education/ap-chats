import type { AppManifest } from '@ap/shell-sdk';

import { loadApp } from './load-app';
import { resolveApp } from './resolve-app';

/**
 * Starts loading what the first screen needs before the shell renders or sign-in
 * resolves: applications that contribute rail tiles, and the one owning the URL.
 * `loadApp` is memoised, so the shell's own mount reuses these requests.
 */
export function preloadApps(apps: AppManifest[], pathname: string): void {
  const active = resolveApp(apps, pathname);
  const firstScreen = apps.filter((app) => app.rail === 'contributed' || app === active);

  for (const app of firstScreen) {
    loadApp(app).catch(() => undefined);
  }
}
