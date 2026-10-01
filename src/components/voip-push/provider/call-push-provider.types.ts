import type { CallSignalPayload } from '@/components/calls/events/call-signal.event';
import type { DeviceRecord } from '@/components/devices';

// One instance per platform, both always present — unlike CallProvider, there is no
// single interchangeable backend to swap in DI here.
//
// Only ever called for `call:incoming`: expo-callkit-telecom's native side requires
// every VoIP/FCM push it receives to carry its exact `incomingCall` wire shape (see
// incoming-call-event.ts) — there's no documented "cancel an already-shown ring"
// push shape, so a device already ringing when the caller hangs up is bounded by
// the native incomingCallTimeout config instead (defaults to 45s, matching
// CallsService's own RING_TTL_SECONDS).
export interface CallPushProvider {
  readonly isConfigured: boolean;
  sendIncomingCall(device: DeviceRecord, payload: CallSignalPayload): Promise<void>;
}
