import type { CallParticipant } from 'expo-callkit-telecom';
import { create } from 'zustand';

import type { CallAudioRoute } from '../types';

export type NativeCallStatus = 'ringing' | 'connecting' | 'connected';

export interface NativeCallState {
  /** The OS-assigned CallSession id — what `endCall`/`setMuted` etc. address. */
  sessionId: string;
  caller: CallParticipant;
  status: NativeCallStatus;
  isMuted: boolean;
  /** Set once `status` reaches 'connected' — NativeInCallScreen's duration timer. */
  connectedAt?: number;
  /** The *other* participant's own state, from trackRemoteParticipant — not
   * this device's. Mirrors web/'s ParticipantAvatarTile (speaking glow ring,
   * remote mute badge next to their name), absent until the room reports it. */
  remoteMuted?: boolean;
  remoteSpeaking?: boolean;
  remoteAudioLevel?: number;
  /** The real output route, per call, so a new call never inherits the last one's speaker. */
  audioRoute?: CallAudioRoute;
}

interface NativeCallStoreState {
  call: NativeCallState | null;
  /** The call stays connected while minimized; only the full screen collapses
   * to NativeMiniCallBar — mirrors web/'s call-store.ts `minimized`. */
  minimized: boolean;
  setCall: (call: NativeCallState) => void;
  updateCall: (patch: Partial<NativeCallState>) => void;
  clearCall: (sessionId?: string) => void;
  minimize: () => void;
  restore: () => void;
}

// Entirely separate from web/'s call-store.ts: this tracks the one native
// CallKit/Telecom session, independent of whether the WebView is even loaded.
export const useNativeCallStore = create<NativeCallStoreState>((set) => ({
  call: null,
  minimized: false,
  setCall: (call) => set({ call }),
  updateCall: (patch) =>
    set((state) => (state.call ? { call: { ...state.call, ...patch } } : state)),
  clearCall: (sessionId) =>
    set((state) =>
      !sessionId || state.call?.sessionId === sessionId ? { call: null, minimized: false } : state,
    ),
  minimize: () => set({ minimized: true }),
  restore: () => set({ minimized: false }),
}));

/** The one source of truth for "is NativeMiniCallBar occupying its own strip
 * of the top safe area right now" — NativeMiniCallBar's own render guard, and
 * also what WebViewHost needs to stop reserving top safe-area padding of its
 * own underneath it (two independent SafeAreaViews both claiming the same
 * inset otherwise double the space, the inset was never a function of either
 * component alone). */
export function useIsMiniCallBarVisible(): boolean {
  return useNativeCallStore(
    (state) => Boolean(state.call) && state.call?.status !== 'ringing' && state.minimized,
  );
}
