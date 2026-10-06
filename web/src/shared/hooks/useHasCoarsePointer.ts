import { useMediaQuery } from '@ap/shell-ui';

const coarsePointerQuery = '(pointer: coarse)';

// True for touchscreens (phones, tablets) regardless of viewport width — unlike
// useIsMobile, a tablet in landscape or a touch laptop still matches this, which is
// what actually determines whether there's an on-screen keyboard to replace.
export function useHasCoarsePointer() {
  return useMediaQuery(coarsePointerQuery);
}
