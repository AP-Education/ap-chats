export class PartUploadError extends Error {
  readonly status: number;
  constructor(status: number) {
    super('Part upload failed');
    this.status = status;
  }
}

export function uploadPart(
  url: string,
  part: Blob,
  signal: AbortSignal,
  onProgress: (bytes: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Upload cancelled', 'AbortError'));
      return;
    }
    const request = new XMLHttpRequest();
    const abort = () => request.abort();
    const cleanup = () => signal.removeEventListener('abort', abort);
    request.open('PUT', url);
    request.timeout = 5 * 60 * 1000;
    request.upload.onprogress = (event) => onProgress(Math.min(event.loaded, part.size));
    request.onload = () => {
      cleanup();
      if (request.status >= 200 && request.status < 300) {
        onProgress(part.size);
        resolve();
      } else reject(new PartUploadError(request.status));
    };
    request.onerror = request.ontimeout = () => {
      cleanup();
      reject(new PartUploadError(0));
    };
    request.onabort = () => {
      cleanup();
      reject(new DOMException('Upload cancelled', 'AbortError'));
    };
    signal.addEventListener('abort', abort, { once: true });
    request.send(part);
  });
}
