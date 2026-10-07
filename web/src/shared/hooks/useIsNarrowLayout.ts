import { useMediaQuery } from '@ap/ui';

const narrowLayoutQuery = '(max-width: 1200px)';

export function useIsNarrowLayout() {
  return useMediaQuery(narrowLayoutQuery);
}
