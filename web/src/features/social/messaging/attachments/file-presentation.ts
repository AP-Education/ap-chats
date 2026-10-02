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
