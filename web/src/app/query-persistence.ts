import {
  defaultShouldDehydrateQuery,
  dehydrate,
  type DehydratedState,
  hydrate,
  type QueryClient,
} from '@tanstack/react-query';

const STORAGE_KEY = 'ap-chats:query-cache';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const SAVE_DELAY_MS = 1000;

interface Snapshot {
  build: string;
  savedAt: number;
  state: DehydratedState;
}

function readSnapshot(): Snapshot | null {
  try {
    const snapshot = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Snapshot | null;
    const isUsable = snapshot?.build === __BUILD_ID__ && Date.now() - snapshot.savedAt < MAX_AGE_MS;
    return isUsable ? snapshot : null;
  } catch {
    return null;
  }
}

function writeSnapshot(queryClient: QueryClient) {
  const state = dehydrate(queryClient, {
    shouldDehydrateQuery: (query) =>
      query.meta?.persist === true && defaultShouldDehydrateQuery(query),
  });
  const snapshot: Snapshot = { build: __BUILD_ID__, savedAt: Date.now(), state };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    return undefined;
  }
}

/**
 * Restores queries marked `meta: { persist: true }` from the last visit and keeps saving them,
 * so the sidebar is on screen at once. Restored data keeps its age and refetches on mount.
 * Returns a function that forgets the saved data, for sign-out.
 */
export function persistQueries(queryClient: QueryClient): () => void {
  const snapshot = readSnapshot();
  if (snapshot) hydrate(queryClient, snapshot.state);

  let saveTimer: ReturnType<typeof setTimeout> | undefined;

  queryClient.getQueryCache().subscribe((event) => {
    const isPersistedUpdate =
      event.type === 'updated' &&
      event.action.type === 'success' &&
      event.query.meta?.persist === true;
    if (!isPersistedUpdate || saveTimer) return;

    saveTimer = setTimeout(() => {
      saveTimer = undefined;
      writeSnapshot(queryClient);
    }, SAVE_DELAY_MS);
  });

  return () => {
    clearTimeout(saveTimer);
    saveTimer = undefined;
    localStorage.removeItem(STORAGE_KEY);
  };
}
