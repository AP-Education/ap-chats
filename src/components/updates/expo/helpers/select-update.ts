import { createHash } from 'node:crypto';

import type { AppUpdateKind } from '@/database/drizzle/schema';

export interface OfferedUpdate {
  id: string;
  kind: AppUpdateKind;
  rolloutPercent: number;
}

/**
 * Where one installation falls for one update, 0–99. The same pair always lands in the same
 * place, so a phone never flips between bundles from one check to the next, and each update
 * draws its own sample of phones.
 */
export function rolloutBucket(installationId: string, updateId: string): number {
  const digest = createHash('sha256').update(`${installationId}:${updateId}`).digest();
  return digest.readUInt32BE(0) % 100;
}

/**
 * The newest update this installation is in the rollout of. `candidates` come newest first and
 * hold only active updates for its platform, channel and runtime. A shell that does not say who
 * it is gets only what has reached everyone.
 */
export function selectUpdate<T extends OfferedUpdate>(
  candidates: readonly T[],
  installationId: string | null,
): T | null {
  return (
    candidates.find((update) =>
      installationId === null
        ? update.rolloutPercent >= 100
        : rolloutBucket(installationId, update.id) < update.rolloutPercent,
    ) ?? null
  );
}
