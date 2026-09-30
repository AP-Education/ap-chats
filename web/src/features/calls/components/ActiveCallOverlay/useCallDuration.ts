import { useEffect, useState } from 'react';

function format(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** mm:ss elapsed since `connectedAt`; empty until the room connection completes. */
export function useCallDuration(connectedAt: number | null): string {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!connectedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [connectedAt]);

  if (!connectedAt) return '';
  return format(Math.max(0, Math.floor((now - connectedAt) / 1000)));
}
