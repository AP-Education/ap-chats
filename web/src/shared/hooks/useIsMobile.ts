import { useMediaQuery } from './useMediaQuery';

const mobileQuery = '(max-width: 768px)';

export function useIsMobile() {
  return useMediaQuery(mobileQuery);
}
