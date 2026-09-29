import { create } from 'zustand';

import type { CallJoinGrant } from '../api/calls-api';
import type { CallSignal } from '../schemas';

export interface ActiveCallSession extends CallJoinGrant {
  workspaceId: string;
  channelId: string;
  /** The channel name or DM participant's name, for the call overlay's header. */
  title: string;
  /**
   * Set only when the call has one specific person on the other end (a DM),
   * so the stage can show who you're calling instead of a generic waiting
   * state while nobody else has joined yet. `undefined` for channel calls,
   * which have no single callee; `null` is a known callee with no photo.
   */
  calleeAvatarPath?: string | null;
}

interface CallStoreState {
  incoming: CallSignal | null;
  active: ActiveCallSession | null;
  /** The call stays connected while minimized; only the stage collapses to a bar. */
  minimized: boolean;
  setIncoming: (signal: CallSignal) => void;
  clearIncoming: (callId?: string) => void;
  setActive: (session: ActiveCallSession) => void;
  clearActive: () => void;
  minimize: () => void;
  restore: () => void;
}

// A single, app-wide call surface: an incoming ring or an open call room can
// originate from any conversation, not just the one currently on screen.
export const useCallStore = create<CallStoreState>((set) => ({
  incoming: null,
  active: null,
  minimized: false,
  setIncoming: (signal) => set({ incoming: signal }),
  clearIncoming: (callId) =>
    set((state) => (!callId || state.incoming?.callId === callId ? { incoming: null } : state)),
  setActive: (session) => set({ active: session, incoming: null, minimized: false }),
  clearActive: () => set({ active: null, minimized: false }),
  minimize: () => set({ minimized: true }),
  restore: () => set({ minimized: false }),
}));
