import * as Application from 'expo-application';
import * as Updates from 'expo-updates';

import { describeShell, type ShellInfo } from '../utils/shell-info';

export function readShellInfo(): ShellInfo {
  return describeShell({
    appVersion: Application.nativeApplicationVersion,
    buildNumber: Application.nativeBuildVersion,
    updatesEnabled: Updates.isEnabled,
    // The channel travels as the expo-channel-name request header, which this reflects.
    channel: Updates.channel,
    runtimeVersion: Updates.runtimeVersion,
    isEmbeddedLaunch: Updates.isEmbeddedLaunch,
    updateId: Updates.updateId,
    createdAt: Updates.createdAt,
  });
}
