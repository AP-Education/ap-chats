import type { CompatDecision, ShellCompat } from '../types';

/**
 * Whether this build may keep running. Fails open: without an answer from the API or a
 * remembered one, the shell runs, so an outage or a slow network never locks people out.
 * Only an explicit minimum above this build stops it.
 */
export function decideCompat(
  build: number | null,
  fresh: ShellCompat | null,
  remembered: ShellCompat | null,
): CompatDecision {
  const compat = fresh ?? remembered;
  if (build === null || !compat || compat.minSupportedBuild === null) return { kind: 'ok' };
  return build < compat.minSupportedBuild
    ? { kind: 'update-required', storeUrl: compat.storeUrl }
    : { kind: 'ok' };
}

/** The native build number the stores know (iOS `CFBundleVersion`, Android `versionCode`). */
export function parseBuildNumber(value: string | null | undefined): number | null {
  if (!value || !/^\d+$/u.test(value)) return null;
  return Number(value);
}
