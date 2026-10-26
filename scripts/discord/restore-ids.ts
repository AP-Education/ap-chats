import { createHash } from 'node:crypto';

import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

export type Tx = Parameters<Parameters<NodePgDatabase['transaction']>[0]>[0];

export interface Tally {
  created: number;
  updated: number;
  unchanged: number;
}

export const newTally = (): Tally => ({ created: 0, updated: 0, unchanged: 0 });

// The same Discord object always lands on the same row, even after it is renamed.
export function importedId(workspaceId: string, discordId: string): string {
  const hash = createHash('sha1').update(`discord:${workspaceId}:${discordId}`).digest();
  hash[6] = (hash[6]! & 0x0f) | 0x50;
  hash[8] = (hash[8]! & 0x3f) | 0x80;

  const hex = hash.subarray(0, 16).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// Keeps each statement well under Postgres' 65 535 bind parameters.
export function inBatches<T>(items: T[], size = 1000): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) batches.push(items.slice(i, i + size));
  return batches;
}
