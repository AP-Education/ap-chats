import type { Attachment } from './types';

export function hasVisualPreview(file: Attachment): boolean {
  return file.preview === 'image' || (file.preview === 'video' && Boolean(file.hasThumbnail));
}
/** A size in the reader's locale, e.g. 1,5 KB in Ukrainian and 1.5 KB in English. */
export function formatFileSize(bytes: number, locale: string): string {
  if (bytes < 1000) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1000;
  let index = 0;
  while (value >= 1000 && index < units.length - 1) {
    value /= 1000;
    index++;
  }
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: value < 10 ? 1 : 0 }).format(value)} ${units[index]}`;
}
