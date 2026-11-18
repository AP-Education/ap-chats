/** What the page shows about the running app, so a tester can tell which update a phone runs. */
export interface ShellInfo {
  appVersion: string | null;
  buildNumber: string | null;
  /** False in a build without an API URL, which never checks for updates. */
  updatesEnabled: boolean;
  /** Null when updates are off, or on in a build made without a channel. */
  channel: string | null;
  runtimeVersion: string | null;
  /** Null while the bundle embedded in the binary runs. */
  updateId: string | null;
  /** When the running update was published, as ISO 8601. */
  updateCreatedAt: string | null;
}

export interface ShellInfoInput {
  appVersion: string | null;
  buildNumber: string | null;
  updatesEnabled: boolean;
  channel: string | null | undefined;
  runtimeVersion: string | null | undefined;
  isEmbeddedLaunch: boolean;
  updateId: string | null | undefined;
  createdAt: Date | null | undefined;
}

export function describeShell(input: ShellInfoInput): ShellInfo {
  const fromUpdate = input.updatesEnabled && !input.isEmbeddedLaunch;
  return {
    appVersion: input.appVersion,
    buildNumber: input.buildNumber,
    updatesEnabled: input.updatesEnabled,
    channel: (input.updatesEnabled && input.channel) || null,
    runtimeVersion: (input.updatesEnabled && input.runtimeVersion) || null,
    updateId: (fromUpdate && input.updateId) || null,
    updateCreatedAt: (fromUpdate && input.createdAt?.toISOString()) || null,
  };
}
