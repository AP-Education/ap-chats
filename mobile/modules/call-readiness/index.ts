import { requireOptionalNativeModule } from 'expo';

export type CallCheckId =
  'notifications' | 'ringsAloud' | 'fullScreen' | 'unrestricted' | 'backgroundAllowed';

export interface CallCheck {
  id: CallCheckId;
  ok: boolean;
}

interface CallReadinessNativeModule {
  checks(): CallCheck[];
  fix(id: CallCheckId): void;
}

// Android only, since CallKit needs neither; optional so a build made before it keeps working.
const ReadinessModule = requireOptionalNativeModule<CallReadinessNativeModule>('CallReadiness');

/** What an incoming call needs from this phone to ring it; nothing where the OS asks for nothing. */
export function readCallChecks(): CallCheck[] {
  return ReadinessModule?.checks() ?? [];
}

/** Opens where the person changes it. */
export function fixCallCheck(id: CallCheckId): void {
  ReadinessModule?.fix(id);
}
