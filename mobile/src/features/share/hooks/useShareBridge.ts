import { useEffect, useRef } from 'react';

import { sendFilePart } from '../api/send-file-part';
import { useShareStore } from '../store/share-store';
import type { ShareEvent, ShareRequest } from '../types';

type PartRequest = Extract<ShareRequest, { type: 'share/send-part' }>;

// The page treats it as final: the file is no longer here to retry with.
const FILE_GONE = 410;
// Often enough for a moving bar, rarely enough not to flood the page with messages.
const PROGRESS_INTERVAL_MS = 250;

/**
 * Sharing over the WebView bridge: hands a share to the page once it can take it, and puts the
 * page's upload parts on the wire from files only native can read.
 */
export function useShareBridge(send: (event: ShareEvent) => void, canDeliver: boolean) {
  const pending = useShareStore((state) => state.pending);
  const webReady = useShareStore((state) => state.webReady);
  const parts = useRef(new Map<number, AbortController>());

  // Delivered again until the page says it took it, as it may reload in between.
  useEffect(() => {
    if (canDeliver && webReady && pending) send({ type: 'share/received', payload: pending });
  }, [canDeliver, webReady, pending, send]);

  useEffect(() => {
    const running = parts.current;
    return () => running.forEach((controller) => controller.abort());
  }, []);

  async function sendPart({ requestId, fileId, url, start, end }: PartRequest) {
    const path = useShareStore.getState().paths[fileId];
    if (!path) {
      send({ type: 'share/part-sent', requestId, status: FILE_GONE });
      return;
    }

    const controller = new AbortController();
    parts.current.set(requestId, controller);
    let reportedAt = 0;
    try {
      const status = await sendFilePart({
        path,
        url,
        start,
        end,
        signal: controller.signal,
        onProgress: (bytes) => {
          if (Date.now() - reportedAt < PROGRESS_INTERVAL_MS) return;
          reportedAt = Date.now();
          send({ type: 'share/part-progress', requestId, bytes });
        },
      });
      send({ type: 'share/part-sent', requestId, status });
    } catch {
      // Cancelled by the page, which no longer waits for an answer.
    } finally {
      parts.current.delete(requestId);
    }
  }

  function request(message: ShareRequest) {
    const store = useShareStore.getState();
    if (message.type === 'share/ready') store.setWebReady(true);
    else if (message.type === 'share/taken') store.take(message.shareId);
    else if (message.type === 'share/cancel-part') parts.current.get(message.requestId)?.abort();
    else void sendPart(message);
  }

  return { request };
}
