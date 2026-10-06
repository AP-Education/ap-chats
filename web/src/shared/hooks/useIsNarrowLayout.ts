import { useMediaQuery } from '@ap/shell-ui';

const narrowLayoutQuery = '(max-width: 1200px)';

export function useIsNarrowLayout() {
  return useMediaQuery(narrowLayoutQuery);
}
