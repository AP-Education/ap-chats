import { type ReactNode, useMemo } from 'react';

import { useActiveWorkspace } from '../../features/workspaces/hooks/useActiveWorkspace';
import { ActiveWorkspaceUnreadScope } from './ActiveWorkspaceUnreadScope';

// Single owner of both unread queries, so nav badges and sidebar sections read one shared result instead of each polling independently.
export function WorkspaceUnreadScope({ children }: { children: ReactNode }) {
  const { workspace, workspaces } = useActiveWorkspace();
  const otherWorkspaceIds = useMemo(
    () => (workspaces ?? []).filter((item) => item.id !== workspace?.id).map((item) => item.id),
    [workspaces, workspace?.id],
  );

  if (!workspace) return children;
  return (
    <ActiveWorkspaceUnreadScope workspaceId={workspace.id} otherWorkspaceIds={otherWorkspaceIds}>
      {children}
    </ActiveWorkspaceUnreadScope>
  );
}
