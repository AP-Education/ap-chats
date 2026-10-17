import { requireOptionalNativeModule } from 'expo';

interface CallReadinessNativeModule {
  notificationsAllowed(): boolean;
  callsRingAloud(): boolean;
  canRingFullScreen(): boolean;
  runsUnrestricted(): boolean;
  mayRunInBackground(): boolean;
  openNotificationSettings(): void;
  openCallChannelSettings(): void;
  openFullScreenSettings(): void;
  askToRunUnrestricted(): void;
  openAppSettings(): void;
}

// Android only, since CallKit needs neither; optional so a build made before it keeps working.
const ReadinessModule = requireOptionalNativeModule<CallReadinessNativeModule>('CallReadiness');

export interface CallReadiness {
  /** An incoming call may light up the locked screen. */
  fullScreen: boolean;
  /** Battery optimisation never holds a call push back. */
  background: boolean;
}

/** What Android lets an incoming call do; everything, where there is nothing to ask. */
export function readCallReadiness(): CallReadiness {
  return {
    fullScreen: ReadinessModule?.canRingFullScreen() ?? true,
    background: ReadinessModule?.runsUnrestricted() ?? true,
  };
}

export interface AndroidCallChecks {
  notifications: boolean;
  ringsAloud: boolean;
  fullScreen: boolean;
  unrestricted: boolean;
  backgroundAllowed: boolean;
}

/** Everything Android checks before a call push may ring this phone; null off Android. */
export function readAndroidCallChecks(): AndroidCallChecks | null {
  if (!ReadinessModule) return null;

  return {
    notifications: ReadinessModule.notificationsAllowed(),
    ringsAloud: ReadinessModule.callsRingAloud(),
    fullScreen: ReadinessModule.canRingFullScreen(),
    unrestricted: ReadinessModule.runsUnrestricted(),
    backgroundAllowed: ReadinessModule.mayRunInBackground(),
  };
}

export function openNotificationSettings(): void {
  ReadinessModule?.openNotificationSettings();
}

export function openCallChannelSettings(): void {
  ReadinessModule?.openCallChannelSettings();
}

export function openFullScreenCallSettings(): void {
  ReadinessModule?.openFullScreenSettings();
}

export function askToRunUnrestricted(): void {
  ReadinessModule?.askToRunUnrestricted();
}

export function openAppSettings(): void {
  ReadinessModule?.openAppSettings();
}
