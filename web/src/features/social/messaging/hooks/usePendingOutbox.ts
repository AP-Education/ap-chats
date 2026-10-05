import { useState } from 'react';

import type { SendMessageCommand } from '../types';

// Reload-survival only: a send whose outcome the current session doesn't yet
// know. 'sending' is written the moment a send starts, before any await, so a
// tab closed mid-request still has something to retry; it plays no part in the
// live-session display, which the optimistic bubble already covers.
export interface PendingSend {
  input: SendMessageCommand;
  createdAt: string;
  status: 'sending' | 'failed';
}

function readPendingSends(key: string): PendingSend[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
    if (!Array.isArray(stored)) return [];
    return (
      stored
        .filter((item): item is PendingSend => {
          if (typeof item !== 'object' || item === null) return false;
          const candidate = item as Partial<PendingSend>;
          return (
            typeof candidate.input?.markdown === 'string' &&
            typeof candidate.input?.clientNonce === 'string' &&
            typeof candidate.createdAt === 'string'
          );
        })
        // Whatever was still 'sending' when the tab closed has an unknown
        // outcome now: treat it the same as a failure, safe to retry (the
        // server dedupes by clientNonce if it actually went through).
        .map((item) => ({ ...item, status: 'failed' as const }))
    );
  } catch {
    return [];
  }
}

/**
 * Persists sends whose outcome this session doesn't yet know across reloads,
 * so a tab closed mid-request still has something to retry. `key` scopes the
 * outbox to one identity/workspace/channel; read once at mount, same as the
 * rest of this feature's per-channel state.
 */
export function usePendingOutbox(key: string) {
  const [pendingSends, setPendingSends] = useState(() => readPendingSends(key));

  function persist(updater: (current: PendingSend[]) => PendingSend[]) {
    setPendingSends((current) => {
      const next = updater(current);
      if (next.length) localStorage.setItem(key, JSON.stringify(next));
      else localStorage.removeItem(key);
      return next;
    });
  }

  function markSending(input: SendMessageCommand, createdAt: string) {
    persist((current) => [
      ...current.filter((entry) => entry.input.clientNonce !== input.clientNonce),
      { input, createdAt, status: 'sending' },
    ]);
  }

  function markFailed(nonce: string) {
    persist((current) =>
      current.map((entry) =>
        entry.input.clientNonce === nonce ? { ...entry, status: 'failed' } : entry,
      ),
    );
  }

  function remove(nonce: string) {
    persist((current) => current.filter((entry) => entry.input.clientNonce !== nonce));
  }

  return { pendingSends, markSending, markFailed, remove };
}
