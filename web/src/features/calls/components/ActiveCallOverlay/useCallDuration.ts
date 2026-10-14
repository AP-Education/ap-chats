import { useEffect, useState } from 'react';

function format(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** mm:ss the call has lasted since someone answered it; empty while it still rings. */
export function useCallDuration(answeredAt: string | null): string {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!answeredAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [answeredAt]);

  if (!answeredAt) return '';
  return format(Math.max(0, Math.floor((now - Date.parse(answeredAt)) / 1000)));
}
