import { useQueryClient } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';

import { PullToRefresh } from './PullToRefresh';

/** Pulled down from its top, refreshes everything on screen, which stays shown meanwhile. */
export function RefreshOnPull({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();

  return (
    <PullToRefresh onRefresh={() => queryClient.refetchQueries({ type: 'active' })}>
      {children}
    </PullToRefresh>
  );
}
