/** How often the shell asks for an update while the app keeps being reopened. */
export const CHECK_INTERVAL_MS = 15 * 60_000;

export function isCheckDue(lastCheckedAt: number | null, now: number): boolean {
  return lastCheckedAt === null || now - lastCheckedAt >= CHECK_INTERVAL_MS;
}

interface FetchedUpdate {
  isNew: boolean;
  isRollBackToEmbedded: boolean;
  manifest?: unknown;
}

/**
 * An ordinary update waits for the next cold start. A rollback, or one published as mandatory,
 * replaces the running bundle as soon as nothing would be lost, since the running one is bad.
 */
export function needsPromptReload(result: FetchedUpdate): boolean {
  if (result.isRollBackToEmbedded) return true;
  if (!result.isNew) return false;
  const manifest = result.manifest as { extra?: { mandatory?: unknown } } | undefined;
  return manifest?.extra?.mandatory === true;
}
