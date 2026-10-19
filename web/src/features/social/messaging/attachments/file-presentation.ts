import type { TFunction } from 'i18next';

import { numberFormat } from '@/shared/i18n/format';

const oneDecimal = numberFormat({ maximumFractionDigits: 1 });
const wholeNumber = numberFormat({ maximumFractionDigits: 0 });

export function formatFileSize(bytes: number, locale: string): string {
  if (bytes < 1000) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1000;
  let index = 0;
  while (value >= 1000 && index < units.length - 1) {
    value /= 1000;
    index++;
  }
  const format = value < 10 ? oneDecimal : wholeNumber;

  return `${format(locale).format(value)} ${units[index]}`;
}

export function fileExtension(name: string, t: TFunction<'messaging'>): string {
  return name.includes('.')
    ? name.split('.').at(-1)!.slice(0, 8).toUpperCase()
    : t(($) => $.attachments.fileFallback);
}
