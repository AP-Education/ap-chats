import { create } from 'zustand';

interface ReadingHold {
  /** The open conversation marked unread, read no further until the person leaves it. */
  heldChannelId: string | null;
  hold: (channelId: string) => void;
  release: (channelId: string) => void;
}

export const useReadingHold = create<ReadingHold>()((set) => ({
  heldChannelId: null,
  hold: (channelId) => set({ heldChannelId: channelId }),
  release: (channelId) =>
    set((state) => (state.heldChannelId === channelId ? { heldChannelId: null } : state)),
}));
