import type { CallSignal } from '../schemas';

// Mirrors src/components/calls/calls.service.ts `notify()`. Calls owns this map
// itself, not realtime: these are call-domain payloads, and realtime only needs
// to expose the generic useSocketEvent primitive, not know this map exists.
export type CallServerToClientEvents = {
  'call:incoming': (payload: CallSignal) => void;
  'call:accepted': (payload: CallSignal) => void;
  'call:declined': (payload: CallSignal) => void;
  'call:ended': (payload: CallSignal) => void;
  'call:missed': (payload: CallSignal) => void;
};
