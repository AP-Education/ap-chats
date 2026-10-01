import type { CallParticipant } from 'expo-callkit-telecom';
import { create } from 'zustand';

export type NativeCallStatus = 'connecting' | 'connected';

export interface NativeCallState {
  /** The OS-assigned CallSession id — what `endCall`/`setMuted` etc. address. */
  sessionId: string;
  caller: CallParticipant;
  status: NativeCallStatus;
  isMuted: boolean;
}

interface NativeCallStoreState {
  call: NativeCallState | null;
  setCall: (call: NativeCallState) => void;
  updateCall: (patch: Partial<NativeCallState>) => void;
  clearCall: (sessionId?: string) => void;
}

// Entirely separate from web/'s call-store.ts: this tracks the one native
// CallKit/Telecom session, independent of whether the WebView is even loaded.
export const useNativeCallStore = create<NativeCallStoreState>((set) => ({
  call: null,
  setCall: (call) => set({ call }),
  updateCall: (patch) =>
    set((state) => (state.call ? { call: { ...state.call, ...patch } } : state)),
  clearCall: (sessionId) =>
    set((state) => (!sessionId || state.call?.sessionId === sessionId ? { call: null } : state)),
}));
