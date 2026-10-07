import type { AppManifest } from '@ap/shell-sdk';

function ownsPath(prefix: string, pathname: string): boolean {
  return prefix === '/' || pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** The application that owns `pathname`: the one with the longest matching prefix. */
export function resolveApp(apps: AppManifest[], pathname: string): AppManifest | undefined {
  let match: { app: AppManifest; length: number } | undefined;
  for (const app of apps) {
    for (const prefix of app.paths) {
      if (ownsPath(prefix, pathname) && prefix.length > (match?.length ?? -1)) {
        match = { app, length: prefix.length };
      }
    }
  }
  return match?.app;
}
