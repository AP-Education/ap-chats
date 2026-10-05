import { create } from 'zustand';

import type { NotificationIntent } from '../utils/notification-intent';

interface NotificationState {
  pending: NotificationIntent | null;
  webReady: boolean;
  context: { connected: boolean; workspaceId?: string; channelId?: string };
  open: (intent: NotificationIntent) => void;
  acknowledge: (eventId: string) => void;
  setReady: (ready: boolean) => void;
  setContext: (context: NotificationState['context']) => void;
}
const consumed = new Set<string>();

export const useNotificationStore = create<NotificationState>((set) => ({
  pending: null,
  webReady: false,
  context: { connected: false },
  open: (pending) => {
    if (!consumed.has(pending.eventId)) set({ pending });
  },
  acknowledge: (eventId) => {
    set((state) => {
      if (state.pending?.eventId !== eventId) return {};
      consumed.add(eventId);
      if (consumed.size > 100) consumed.delete(consumed.values().next().value!);
      return { pending: null };
    });
  },
  setReady: (webReady) =>
    set({ webReady, ...(!webReady ? { context: { connected: false } } : {}) }),
  setContext: (context) => set({ context }),
}));
