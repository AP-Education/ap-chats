import { useMemo, useReducer } from 'react';

/** One thing shown over the page at a time, such as a dialog or a sheet. */
export interface Overlay<Item> {
  /** Kept after close, so the overlay keeps its content through the exit animation. */
  item: Item | null;
  open: boolean;
  /** Counts showings: keyed by it, each one starts afresh, even for the same item. */
  showing: number;
}

export type OverlayAction<Item> = { type: 'show'; item: Item } | { type: 'close' };

export function hiddenOverlay<Item>(): Overlay<Item> {
  return { item: null, open: false, showing: 0 };
}

export function overlay<Item>(state: Overlay<Item>, action: OverlayAction<Item>): Overlay<Item> {
  switch (action.type) {
    case 'show':
      return { item: action.item, open: true, showing: state.showing + 1 };
    case 'close':
      return { ...state, open: false };
  }
}

export function useOverlay<Item>() {
  const [state, dispatch] = useReducer(overlay<Item>, undefined, hiddenOverlay<Item>);

  const actions = useMemo(
    () => ({
      show: (item: Item) => dispatch({ type: 'show', item }),
      close: () => dispatch({ type: 'close' }),
    }),
    [],
  );

  return { ...state, ...actions };
}
