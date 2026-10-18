import { uploadPart } from './upload-part';

/**
 * A file the composer uploads, whoever holds its bytes: the browser, or the native shell for a
 * file shared from another app, which the page cannot read itself.
 */
export interface UploadFile {
  name: string;
  size: number;
  type: string;
  /** The same for the same file, so adding it twice uploads it once. */
  identity: string;
  /** A picture of it to show while it uploads, made once it is accepted; the queue revokes it. */
  preview: () => string | undefined;
  /** Puts bytes [start, end) at a presigned part URL, reporting how many of them went so far. */
  sendPart: (
    url: string,
    start: number,
    end: number,
    signal: AbortSignal,
    onProgress: (bytes: number) => void,
  ) => Promise<void>;
}

const PREVIEWED_TYPE = /^image\/(jpeg|png|webp|gif)$/;
const MAX_PREVIEWED_BYTES = 20 * 1024 * 1024;

function browserUploadFile(file: File): UploadFile {
  return {
    name: file.name,
    size: file.size,
    type: file.type,
    identity: `${file.name}:${file.size}:${file.lastModified}`,
    preview: () =>
      PREVIEWED_TYPE.test(file.type) && file.size <= MAX_PREVIEWED_BYTES
        ? URL.createObjectURL(file)
        : undefined,
    sendPart: (url, start, end, signal, onProgress) =>
      uploadPart(url, file.slice(start, end), signal, onProgress),
  };
}

export function toUploadFile(file: File | UploadFile): UploadFile {
  return file instanceof File ? browserUploadFile(file) : file;
}
