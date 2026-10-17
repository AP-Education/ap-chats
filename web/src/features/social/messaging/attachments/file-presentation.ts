export function formatFileSize(bytes: number): string {
  if (bytes < 1000) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1000;
  let index = 0;
  while (value >= 1000 && index < units.length - 1) {
    value /= 1000;
    index++;
  }
  return `${new Intl.NumberFormat('uk-UA', { maximumFractionDigits: value < 10 ? 1 : 0 }).format(value)} ${units[index]}`;
}

export function fileExtension(name: string): string {
  return name.includes('.') ? name.split('.').at(-1)!.slice(0, 8).toUpperCase() : 'ФАЙЛ';
}

/** A name in two parts for truncating in the middle: the head gives way, the tail with the
 * extension stays, so `quarterly-report-final.pdf` reads as `quarterly-re…final.pdf`. */
export function splitFileName(name: string): { head: string; tail: string } {
  const dot = name.lastIndexOf('.');
  const extension = dot > 0 && name.length - dot <= 9 ? name.length - dot : 0;
  const cut = Math.max(0, name.length - extension - 5);
  return { head: name.slice(0, cut), tail: name.slice(cut) };
}
