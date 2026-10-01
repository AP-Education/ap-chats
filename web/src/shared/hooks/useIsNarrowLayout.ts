import { useMediaQuery } from './useMediaQuery';

const narrowLayoutQuery = '(max-width: 1200px)';

export function useIsNarrowLayout() {
  return useMediaQuery(narrowLayoutQuery);
}
