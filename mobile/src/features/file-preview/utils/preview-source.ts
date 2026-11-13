import type { FilePreviewSource } from '../types';

/** A download event provides a remote resource, never an executable or local-file address. */
export function filePreviewSource(downloadUrl: string): FilePreviewSource | null {
  try {
    const address = new URL(downloadUrl);
    const isRemote = address.protocol === 'https:' || address.protocol === 'http:';
    if (!isRemote) return null;

    return { uri: address.href };
  } catch {
    return null;
  }
}

/** Signed storage URLs identify downloads before an expired link can replace the app with an error. */
export function requestedFilePreview(request: {
  url: string;
  isTopFrame?: boolean;
}): FilePreviewSource | null {
  const isMainDocument = request.isTopFrame === true;
  if (!isMainDocument) return null;

  const source = filePreviewSource(request.url);
  if (!source) return null;

  const disposition = new URL(source.uri).searchParams.get('response-content-disposition');
  const isDownload = disposition !== null && /^attachment(?:;|$)/i.test(disposition.trim());
  return isDownload ? source : null;
}
