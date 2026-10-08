import { useMemo, useState } from 'react';

import { enqueue, markFailed, type OutboxEntry, restore, unsent, without } from '../outbox';
import type { SendMessageCommand } from '../types';

function read(key: string): OutboxEntry[] {
  try {
    return restore(JSON.parse(localStorage.getItem(key) ?? '[]'));
  } catch {
    return [];
  }
}

function write(key: string, entries: readonly OutboxEntry[]) {
  if (entries.length) localStorage.setItem(key, JSON.stringify(entries));
  else localStorage.removeItem(key);
}

/**
 * The channel's unsent messages, persisted so a send a reload interrupted can still be
 * retried. `delivered` holds the nonces history already has: those entries have landed,
 * so they are neither shown nor kept. `key` scopes the outbox to one
 * identity/workspace/channel and is read once at mount.
 */
export function useOutbox(key: string, delivered: ReadonlySet<string>) {
  const [entries, setEntries] = useState(() => read(key));
  const visible = useMemo(() => unsent(entries, delivered), [entries, delivered]);

  function update(change: (current: readonly OutboxEntry[]) => OutboxEntry[]) {
    setEntries((current) => {
      const next = unsent(change(current), delivered);
      write(key, next);
      return next;
    });
  }

  return {
    unsent: visible,
    enqueue: (input: SendMessageCommand, createdAt: string) =>
      update((current) => enqueue(current, input, createdAt)),
    fail: (nonce: string) => update((current) => markFailed(current, nonce)),
    settle: (nonce: string) => update((current) => without(current, nonce)),
  };
}
