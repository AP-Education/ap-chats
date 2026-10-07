import type { AppManifest } from '@ap/shell-sdk';
import { useState } from 'react';

/** How many applications without pinned rail tiles stay mounted: the active one plus recent others. */
const MAX_CACHED_APPS = 3;

/**
 * Ids of the applications to keep mounted. Applications that contribute rail tiles are
 * always mounted so their tiles never disappear; the rest are cached, most recent first.
 */
export function useMountedApps(apps: AppManifest[], activeId: string | undefined): string[] {
  const [recent, setRecent] = useState<string[]>([]);
  const pinned = apps.filter((app) => app.rail === 'contributed').map((app) => app.id);

  if (activeId && !pinned.includes(activeId) && recent[0] !== activeId) {
    setRecent([activeId, ...recent.filter((id) => id !== activeId)].slice(0, MAX_CACHED_APPS));
  }

  return [...pinned, ...recent];
}
