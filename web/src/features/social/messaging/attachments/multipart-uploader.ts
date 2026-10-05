import { ApiError } from '@/shared/api/http';

import { beginUpload, cancelUpload, completeUpload, signUploadPart } from './attachments-api';
import type { Attachment, UploadScope, UploadSession } from './types';
import { PartUploadError, uploadPart } from './upload-part';

/**
 * A part URL's own 403 (expired presign) is worth retrying with a fresh one;
 * a 403 from the JSON API means the request itself was rejected and won't
 * succeed on retry. Anything below 500 besides those is a client error too.
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof ApiError) return error.status >= 500;
  if (error instanceof PartUploadError)
    return error.status === 0 || error.status === 403 || error.status >= 500;
  return true;
}

export interface UploadResumeState {
  session?: UploadSession;
  completed: Set<number>;
  bytes: Map<number, number>;
}

export interface MultipartUploadHandlers {
  onProgress: (sentBytes: number) => void;
  onProcessing: () => void;
}

/**
 * The wire protocol for getting one file into storage: open or resume a
 * session, push its parts with bounded concurrency and retry/backoff, then
 * complete it. Knows nothing about a queue, drafts, or how many files a
 * caller juggles at once — that scheduling lives in UploadQueue.
 */
export class MultipartUploader {
  private readonly token: () => string;
  private readonly scope: UploadScope;

  constructor(token: () => string, scope: UploadScope) {
    this.token = token;
    this.scope = scope;
  }

  async upload(
    file: File,
    resume: UploadResumeState,
    signal: AbortSignal,
    { onProgress, onProcessing }: MultipartUploadHandlers,
  ): Promise<{ session: UploadSession; attachment: Attachment }> {
    resume.session ??= await beginUpload(this.token(), this.scope, file);
    const session = resume.session;
    if (signal.aborted) {
      void cancelUpload(this.token(), this.scope, session.id).catch(() => undefined);
      throw new DOMException('Upload cancelled', 'AbortError');
    }
    // A worker's own failure also has to stop its sibling part-stream right
    // away, not just the caller's cancellation — hence a controller scoped to
    // this file's transfer rather than reusing the caller's signal directly.
    const internal = new AbortController();
    const abortInternal = () => internal.abort();
    signal.addEventListener('abort', abortInternal, { once: true });
    const remaining = Array.from(
      { length: Math.ceil(file.size / session.partBytes) },
      (_, index) => index + 1,
    ).filter((number) => !resume.completed.has(number));

    const sendPart = async () => {
      while (remaining.length && !internal.signal.aborted) {
        const number = remaining.shift()!;
        const part = file.slice(
          (number - 1) * session.partBytes,
          Math.min(number * session.partBytes, file.size),
        );
        for (let attempt = 0; ; attempt++) {
          try {
            resume.bytes.set(number, 0);
            const { url } = await signUploadPart(this.token(), this.scope, session.id, number);
            await uploadPart(url, part, internal.signal, (bytes) => {
              resume.bytes.set(number, bytes);
              onProgress([...resume.bytes.values()].reduce((sum, value) => sum + value, 0));
            });
            resume.completed.add(number);
            break;
          } catch (error) {
            if (internal.signal.aborted || attempt >= 2 || !isRetryableError(error)) throw error;
            await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
            if (internal.signal.aborted) throw error;
          }
        }
      }
    };
    try {
      // Wait for both workers before freeing the queue slot, including after failure.
      let firstFailure: unknown;
      const worker = () =>
        sendPart().catch((error) => {
          firstFailure ??= error;
          internal.abort();
          throw error;
        });
      const workers = await Promise.allSettled([worker(), worker()]);
      const failure = workers.find((result) => result.status === 'rejected');
      if (failure) throw firstFailure;
      if (signal.aborted) throw new DOMException('Upload cancelled', 'AbortError');

      onProcessing();
      const attachment = await completeUpload(this.token(), this.scope, session.id);
      return { session, attachment };
    } finally {
      signal.removeEventListener('abort', abortInternal);
    }
  }

  /** Best-effort: used to abandon a session the caller never finished, so no token means nothing to do. */
  cancel(token: string | undefined, session: UploadSession | undefined): void {
    if (session && token) void cancelUpload(token, this.scope, session.id).catch(() => undefined);
  }
}
