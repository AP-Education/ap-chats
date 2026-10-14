export function formatCallDuration(answeredAt: string, endedAt: string): string {
  const seconds = Math.max(0, Math.round((Date.parse(endedAt) - Date.parse(answeredAt)) / 1000));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
