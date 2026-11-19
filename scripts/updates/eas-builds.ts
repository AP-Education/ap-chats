/**
 * The runtime version EAS recorded for one store build, from `eas build:list --json`. That is the
 * fingerprint the build really carries, whatever this checkout would compute.
 */
export function runtimeOfBuild(builds: unknown, buildNumber: number): string {
  if (!Array.isArray(builds)) throw new Error('EAS did not list builds');
  const versions = new Set(
    builds
      .map(
        (build) => build as { appBuildVersion?: unknown; runtime?: { version?: unknown } | null },
      )
      .filter((build) => String(build.appBuildVersion) === String(buildNumber))
      .map((build) => build.runtime?.version)
      .filter((version): version is string => typeof version === 'string' && version.length > 0),
  );
  if (versions.size === 0)
    throw new Error(`EAS has no finished build ${buildNumber} with a runtime`);
  if (versions.size > 1)
    throw new Error(
      `EAS builds numbered ${buildNumber} disagree on the runtime: name it with --runtime`,
    );
  return [...versions][0]!;
}
