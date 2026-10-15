import type { CallSignalPayload } from '@/components/calls/calls/events/call-signal.event';
import type { RingEndReason } from '@/components/calls/calls/events/ring-ended.event';
import type { DeviceRecord } from '@/components/devices';

// One instance per platform, both always present — unlike CallProvider, there is no
// single interchangeable backend to swap in DI here.
export interface CallPushProvider {
  readonly isConfigured: boolean;
  sendIncomingCall(device: DeviceRecord, payload: CallSignalPayload): Promise<void>;
  /** Stops a ring this device may still be playing, with or without the app running. */
  sendRingEnded(device: DeviceRecord, callId: string, reason: RingEndReason): Promise<void>;
}
