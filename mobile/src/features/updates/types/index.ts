/** What the API says about this platform's store builds (`GET /api/updates/compat`). */
export interface ShellCompat {
  /** Builds below this must update from the store; null keeps every build working. */
  minSupportedBuild: number | null;
  storeUrl: string | null;
}

export type CompatDecision = { kind: 'ok' } | { kind: 'update-required'; storeUrl: string | null };
