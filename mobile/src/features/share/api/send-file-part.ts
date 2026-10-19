import { File, Paths } from 'expo-file-system';

interface FilePart {
  path: string;
  url: string;
  start: number;
  end: number;
  signal: AbortSignal;
  onProgress: (bytes: number) => void;
}

// An upload sends a whole file, so a part of a larger one goes through a temporary copy.
function copyOfRange(source: File, start: number, end: number): File {
  const handle = source.open();
  try {
    handle.offset = start;
    const part = new File(Paths.cache, `share-part-${Date.now()}-${start}`);
    part.create();
    part.write(handle.readBytes(end - start));
    return part;
  } finally {
    handle.close();
  }
}

/** Puts bytes [start, end) of a file at a presigned URL straight from disk; the HTTP status, or 0 when none came. */
export async function sendFilePart({
  path,
  url,
  start,
  end,
  signal,
  onProgress,
}: FilePart): Promise<number> {
  const source = new File(path);
  const isWhole = start === 0 && end === source.size;
  const body = isWhole ? source : copyOfRange(source, start, end);

  try {
    const result = await body.upload(url, {
      httpMethod: 'PUT',
      signal,
      onProgress: ({ bytesSent }) => onProgress(bytesSent),
    });
    return result.status;
  } catch (error) {
    if (signal.aborted) throw error;
    return 0;
  } finally {
    if (!isWhole) body.delete();
  }
}
