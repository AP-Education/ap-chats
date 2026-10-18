import type { ShareIntent } from 'expo-share-intent';

import type { SharedContent } from '../types';

/** What was shared, as the page sees it, and where each of its files lies, which only native keeps. */
export interface ReceivedShare {
  content: SharedContent;
  paths: Record<string, string>;
}

/**
 * A share the page can send, or none when it carries nothing. `sizeOf` reads a file's size from
 * disk for the apps that leave it out, since an upload needs it up front.
 */
export function receivedShare(
  intent: ShareIntent,
  id: string,
  sizeOf: (path: string) => number,
): ReceivedShare | null {
  const files = (intent.files ?? []).map((file, index) => ({ fileId: `${id}:${index}`, file }));
  const text = intent.text?.trim() || intent.webUrl || null;
  if (!text && !files.length) return null;

  return {
    content: {
      id,
      text,
      files: files.map(({ fileId, file }) => ({
        id: fileId,
        name: file.fileName,
        size: file.size ?? sizeOf(file.path),
        type: file.mimeType,
      })),
    },
    paths: Object.fromEntries(files.map(({ fileId, file }) => [fileId, file.path])),
  };
}
