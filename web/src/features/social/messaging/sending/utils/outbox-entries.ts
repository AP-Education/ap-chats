import type { SendMessageCommand } from '../../types';
import type { OutboxEntry } from '../types';

function nonceOf(entry: OutboxEntry): string {
  return entry.input.clientNonce;
}

/** Queues a send; a retry takes the place of its failed entry rather than adding one. */
export function enqueue(
  entries: readonly OutboxEntry[],
  input: SendMessageCommand,
  createdAt: string,
  awaitsFiles = false,
): OutboxEntry[] {
  const entry: OutboxEntry = awaitsFiles
    ? { input, createdAt, status: 'uploading', awaitsFiles }
    : { input, createdAt, status: 'sending' };
  return [...without(entries, input.clientNonce), entry];
}

export function update(
  entries: readonly OutboxEntry[],
  nonce: string,
  change: Partial<OutboxEntry>,
): OutboxEntry[] {
  return entries.map((entry) => (nonceOf(entry) === nonce ? { ...entry, ...change } : entry));
}

export function without(entries: readonly OutboxEntry[], nonce: string): OutboxEntry[] {
  return entries.filter((entry) => nonceOf(entry) !== nonce);
}

/** History is the truth: a nonce it already holds has landed, however its own request
 * ended, so the entry is no longer an unsent message. */
export function unsent(
  entries: readonly OutboxEntry[],
  delivered: ReadonlySet<string>,
): OutboxEntry[] {
  return entries.filter((entry) => !delivered.has(nonceOf(entry)));
}

/** What survives a reload: files live only in this page, so a message still waiting on them can't. */
export function persistable(entries: readonly OutboxEntry[]): OutboxEntry[] {
  return entries.filter((entry) => !entry.awaitsFiles);
}

/** Entries read back after a reload. A send still in flight then has an unknown outcome,
 * so it waits for a retry like a failure; the server dedupes by nonce if it did land. */
export function restore(stored: unknown): OutboxEntry[] {
  if (!Array.isArray(stored)) return [];

  return persistable(stored.filter(isStoredEntry)).map((entry) => ({
    ...entry,
    status: 'failed',
  }));
}

function isStoredEntry(value: unknown): value is OutboxEntry {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<OutboxEntry>;
  return (
    typeof candidate.input?.markdown === 'string' &&
    typeof candidate.input?.clientNonce === 'string' &&
    typeof candidate.createdAt === 'string'
  );
}
