import { create } from 'zustand';

import type { SharedContent } from '../types';
import type { ReceivedShare } from '../utils/received-share';

interface ShareState {
  /** A share the page has not taken yet. */
  pending: SharedContent | null;
  /** The page has said it can take a share; reset whenever it reloads or the session ends. */
  webReady: boolean;
  /** Where each shared file lies, kept for as long as the page may still upload it. */
  paths: Record<string, string>;
  receive: (share: ReceivedShare) => void;
  take: (shareId: string) => void;
  setWebReady: (ready: boolean) => void;
}

export const useShareStore = create<ShareState>((set) => ({
  pending: null,
  webReady: false,
  paths: {},

  receive: ({ content, paths }) =>
    set((state) => ({ pending: content, paths: { ...state.paths, ...paths } })),

  take: (shareId) => set((state) => (state.pending?.id === shareId ? { pending: null } : {})),

  setWebReady: (webReady) => set({ webReady }),
}));
