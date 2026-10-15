import { PanelBody } from '@ap-education/ui';
import type { PropsWithChildren } from 'react';

import { RefreshOnPull } from '@/shared/ui/PullToRefresh/RefreshOnPull';

/** A panel body pulled down to refresh everything on screen, which stays shown meanwhile. */
export function RefreshablePanelBody({ hidden, children }: PropsWithChildren<{ hidden: boolean }>) {
  return (
    <PanelBody hidden={hidden}>
      <RefreshOnPull>{children}</RefreshOnPull>
    </PanelBody>
  );
}
