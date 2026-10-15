import { requireOptionalNativeModule } from 'expo';

interface CallReadinessNativeModule {
  canRingFullScreen(): boolean;
  runsUnrestricted(): boolean;
  openFullScreenSettings(): void;
  askToRunUnrestricted(): void;
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

export function openFullScreenCallSettings(): void {
  ReadinessModule?.openFullScreenSettings();
}

export function askToRunUnrestricted(): void {
  ReadinessModule?.askToRunUnrestricted();
}
