import { isPhoneAsleep, readCallChecks } from '../../../../modules/call-readiness';
import { rememberRingInTheDark } from '../api/readiness-prompt-state';
import type { CallKitApi } from './callkit-module';

/** A ring that Android could show only as a notification on a sleeping phone. */
export async function noteRingInTheDark(CallKit: CallKitApi): Promise<void> {
  const ring = await CallKit.getActiveCallSession();
  if (ring?.status !== 'ringing' || !isPhoneAsleep()) return;

  const lightsScreen = readCallChecks().find((check) => check.id === 'fullScreen')?.ok ?? true;
  if (!lightsScreen) await rememberRingInTheDark();
}
