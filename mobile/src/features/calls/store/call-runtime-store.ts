import { create } from 'zustand';

interface CallRuntimeState {
  claims: symbol[];
  claim: (claim: symbol) => void;
  release: (claim: symbol) => void;
}

/** Every root claims the call runtime; the earliest claim still mounted runs it. */
export const useCallRuntimeStore = create<CallRuntimeState>((set) => ({
  claims: [],
  claim: (claim) => set((state) => ({ claims: [...state.claims, claim] })),
  release: (claim) => set((state) => ({ claims: state.claims.filter((each) => each !== claim) })),
}));
