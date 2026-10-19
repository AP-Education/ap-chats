import type { OutboxEntry, OutboxStorage } from '../types';

export function localOutboxStorage(key: string): OutboxStorage {
  return {
    read: () => {
      try {
        return JSON.parse(localStorage.getItem(key) ?? '[]');
      } catch {
        return [];
      }
    },
    write: (entries: readonly OutboxEntry[]) => {
      if (entries.length) localStorage.setItem(key, JSON.stringify(entries));
      else localStorage.removeItem(key);
    },
  };
}
