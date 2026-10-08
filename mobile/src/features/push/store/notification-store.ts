import { create } from 'zustand';

import type { NotificationIntent } from '../utils/notification-intent';

interface NotificationState {
  /** A tapped notification the page has not routed yet. */
  pending: NotificationIntent | null;
  /** The page has said it can route a tap; reset whenever it reloads or the session ends. */
  webReady: boolean;
  /** The user is reading the WebView, which alerts with its own sound. */
  webAttending: boolean;
  lastOpenedEventId: string | null;
  open: (intent: NotificationIntent) => void;
  acknowledge: (eventId: string) => void;
  setWebReady: (ready: boolean) => void;
  setWebAttending: (attending: boolean) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  pending: null,
  webReady: false,
  webAttending: false,
  lastOpenedEventId: null,

  // The tap listener and the cold-start response can report the same tap twice.
  open: (pending) =>
    set((state) => (state.lastOpenedEventId === pending.eventId ? {} : { pending })),

  acknowledge: (eventId) =>
    set((state) =>
      state.pending?.eventId === eventId ? { pending: null, lastOpenedEventId: eventId } : {},
    ),

  setWebReady: (webReady) => set(webReady ? { webReady } : { webReady, webAttending: false }),
  setWebAttending: (webAttending) => set({ webAttending }),
}));
