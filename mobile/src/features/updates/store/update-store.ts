import { create } from 'zustand';

import type { PageReloadState } from '../utils/reload-decision';

interface UpdateState {
  /** A fetched update should replace the running bundle as soon as nothing would be lost. */
  reloadWanted: boolean;
  page: PageReloadState;
  /** The parts of the page that report work a reload would lose right now. */
  busySources: readonly string[];
  /** A page's own code has run in this launch (`page/started`). */
  pageLoaded: boolean;
  wantReload: () => void;
  /** A page is loaded and has not reported yet: on mount and on every new document. */
  pageStarted: () => void;
  pageGone: () => void;
  markPageLoaded: () => void;
  setPageBusy: (source: string, busy: boolean) => void;
}

export const useUpdateStore = create<UpdateState>((set) => ({
  reloadWanted: false,
  page: 'none',
  busySources: [],
  pageLoaded: false,
  wantReload: () => set({ reloadWanted: true }),
  pageStarted: () => set({ page: 'silent', busySources: [] }),
  pageGone: () => set({ page: 'none', busySources: [] }),
  markPageLoaded: () => set({ pageLoaded: true }),
  setPageBusy: (source, busy) =>
    set((state) => ({
      page: 'reporting',
      busySources: busy
        ? [...new Set([...state.busySources, source])]
        : state.busySources.filter((current) => current !== source),
    })),
}));
