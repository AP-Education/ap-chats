// The app-info messages of the native bridge; mirrors mobile/src/features/webview/types/index.ts.

/** The phone app's version and the over-the-air update it runs. */
export interface ShellInfo {
  appVersion: string | null;
  buildNumber: string | null;
  /** False in a build that never checks for updates. */
  updatesEnabled: boolean;
  /** Null when updates are off, or on in a build made without a channel. */
  channel: string | null;
  runtimeVersion: string | null;
  /** Null while the bundle embedded in the binary runs. */
  updateId: string | null;
  /** ISO 8601. */
  updateCreatedAt: string | null;
}

export type AppInfoToNativeMessage = { type: 'shell/info-request' };
