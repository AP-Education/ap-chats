import { PanelBody } from '@ap-education/ui';
import { useQueryClient } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';

import { PullToRefresh } from '@/shared/ui/PullToRefresh/PullToRefresh';

/** A panel body pulled down to refresh everything on screen, which stays shown meanwhile. */
export function RefreshablePanelBody({ hidden, children }: PropsWithChildren<{ hidden: boolean }>) {
  const queryClient = useQueryClient();

  return (
    <PanelBody hidden={hidden}>
      <PullToRefresh onRefresh={() => queryClient.refetchQueries({ type: 'active' })}>
        {children}
      </PullToRefresh>
    </PanelBody>
  );
}
