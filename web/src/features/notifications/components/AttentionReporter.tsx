import { isNativeShell } from '@ap-education/shell-sdk';
import { useEffect } from 'react';

import { useConnection } from '@/features/realtime/stores/realtime-context';
import { isPresent } from '@/shared/hooks/useIsAttending';

import { reportAttention, reportAttentionToShell } from '../api/attention';

// Inside the server's 45-second lease, and often enough to notice the user going idle.
const RENEW_MS = 20_000;

/**
 * Says whether the user is reading here to whoever holds alerts back: the server in a browser, so
 * no device gets a push meanwhile, or the native shell, which then skips its foreground banner.
 */
export function AttentionReporter() {
  const { socket } = useConnection();

  useEffect(() => {
    if (!socket) return;

    const connection = socket;
    const inShell = isNativeShell();
    let reported = false;

    function report() {
      const present = connection.connected && isPresent();

      if (inShell && present !== reported) reportAttentionToShell(present);
      // The server's lease is renewed while present; leaving is said once.
      if (!inShell && (present || reported)) reportAttention(connection, present);

      reported = present;
    }

    function wake() {
      if (!reported) report();
    }

    const renew = window.setInterval(report, RENEW_MS);
    const changes = ['focus', 'blur', 'pageshow'];
    changes.forEach((type) => window.addEventListener(type, report));
    window.addEventListener('pointerdown', wake);
    window.addEventListener('keydown', wake);
    document.addEventListener('visibilitychange', report);
    socket.on('connect', report);
    socket.on('disconnect', report);
    report();

    return () => {
      window.clearInterval(renew);
      changes.forEach((type) => window.removeEventListener(type, report));
      window.removeEventListener('pointerdown', wake);
      window.removeEventListener('keydown', wake);
      document.removeEventListener('visibilitychange', report);
      socket.off('connect', report);
      socket.off('disconnect', report);
    };
  }, [socket]);

  return null;
}
