import type { ReactNode } from 'react';

import { useActiveWorkspace } from '../../features/workspaces/hooks/useActiveWorkspace';
import { ActiveWorkspaceUnreadScope } from './ActiveWorkspaceUnreadScope';

// Single owner of both unread queries, so nav badges and sidebar sections read one shared result instead of each polling independently.
export function WorkspaceUnreadScope({ children }: { children: ReactNode }) {
  const { workspace } = useActiveWorkspace();
  if (!workspace) return children;
  return (
    <ActiveWorkspaceUnreadScope workspaceId={workspace.id}>{children}</ActiveWorkspaceUnreadScope>
  );
}
