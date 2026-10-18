import { onNativeMessage, postToNative } from '@ap-education/shell-sdk';

import type { UploadFile } from '@/features/social/messaging/attachments/upload-file';
import { PartUploadError } from '@/features/social/messaging/attachments/upload-part';

import type { SharedFile, ShareFromNativeMessage, ShareToNativeMessage } from '../types';

// The browser's own part upload gives up after as long.
const PART_TIMEOUT_MS = 5 * 60 * 1000;

let lastRequestId = 0;

function tellNative(message: ShareToNativeMessage): void {
  postToNative(message);
}

/** The shell puts the bytes at the presigned URL itself, as only it can read the file. */
function sendPart(
  fileId: string,
  url: string,
  start: number,
  end: number,
  signal: AbortSignal,
  onProgress: (bytes: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Upload cancelled', 'AbortError'));
      return;
    }

    const requestId = ++lastRequestId;
    const stopListening = onNativeMessage<ShareFromNativeMessage>((message) => {
      if (message.type === 'share/received' || message.requestId !== requestId) return;
      if (message.type === 'share/part-progress') {
        onProgress(message.bytes);
        return;
      }

      finish();
      if (message.status >= 200 && message.status < 300) {
        onProgress(end - start);
        resolve();
      } else reject(new PartUploadError(message.status));
    });
    const timeout = setTimeout(() => {
      tellNative({ type: 'share/cancel-part', requestId });
      finish();
      reject(new PartUploadError(0));
    }, PART_TIMEOUT_MS);
    const abort = () => {
      tellNative({ type: 'share/cancel-part', requestId });
      finish();
      reject(new DOMException('Upload cancelled', 'AbortError'));
    };

    function finish() {
      stopListening();
      clearTimeout(timeout);
      signal.removeEventListener('abort', abort);
    }

    signal.addEventListener('abort', abort, { once: true });
    tellNative({ type: 'share/send-part', requestId, fileId, url, start, end });
  });
}

export function sharedUploadFile(file: SharedFile): UploadFile {
  return {
    name: file.name,
    size: file.size,
    type: file.type,
    identity: `shared:${file.id}`,
    preview: () => undefined,
    sendPart: (url, start, end, signal, onProgress) =>
      sendPart(file.id, url, start, end, signal, onProgress),
  };
}
