import { File } from 'expo-file-system';
import { useShareIntentContext } from 'expo-share-intent';
import { useEffect } from 'react';

import { useShareStore } from '../store/share-store';
import { receivedShare } from '../utils/received-share';

function shareId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Takes what another app shared into the app's own keeping, until the page can send it. */
export function ShareIntake() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();

  useEffect(() => {
    if (!hasShareIntent) return;

    const share = receivedShare(shareIntent, shareId(), (path) => new File(path).size);
    if (share) useShareStore.getState().receive(share);
    // Only the intent is cleared; its files stay on disk for the uploads.
    resetShareIntent();
  }, [hasShareIntent, shareIntent, resetShareIntent]);

  return null;
}
