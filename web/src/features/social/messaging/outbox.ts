import type { SendMessageCommand } from './types';

/** Where an unsent message stands: on its way, or stopped and waiting for a retry. */
export type OutboxStatus = 'sending' | 'failed';

/** A message this client wrote that history doesn't hold yet. */
export interface OutboxEntry {
  input: SendMessageCommand;
  createdAt: string;
  status: OutboxStatus;
}

function nonceOf(entry: OutboxEntry): string {
  return entry.input.clientNonce;
}

/** Queues a send; a retry takes the place of its failed entry rather than adding one. */
export function enqueue(
  entries: readonly OutboxEntry[],
  input: SendMessageCommand,
  createdAt: string,
): OutboxEntry[] {
  return [...without(entries, input.clientNonce), { input, createdAt, status: 'sending' }];
}

export function markFailed(entries: readonly OutboxEntry[], nonce: string): OutboxEntry[] {
  return entries.map((entry) =>
    nonceOf(entry) === nonce ? { ...entry, status: 'failed' } : entry,
  );
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

/** Entries read back after a reload. A send still in flight then has an unknown outcome,
 * so it waits for a retry like a failure; the server dedupes by nonce if it did land. */
export function restore(stored: unknown): OutboxEntry[] {
  if (!Array.isArray(stored)) return [];

  return stored.filter(isStoredEntry).map((entry) => ({ ...entry, status: 'failed' }));
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
