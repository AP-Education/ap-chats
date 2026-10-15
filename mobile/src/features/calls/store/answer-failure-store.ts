import { create } from 'zustand';

/** Why an answer never connected: no session to join with, or the call itself. */
export type AnswerFailure = 'signed-out' | 'unreachable';

interface AnswerFailureState {
  failure: AnswerFailure | null;
  fail: (failure: AnswerFailure) => void;
  clear: () => void;
}

/** The last answer's failure; it outlives that call, so the call window can say why it closes. */
export const useAnswerFailureStore = create<AnswerFailureState>((set) => ({
  failure: null,
  fail: (failure) => set({ failure }),
  clear: () => set({ failure: null }),
}));
