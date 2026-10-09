import { useQueryClient } from '@tanstack/react-query';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useSocketEvent } from '@/features/realtime/hooks/useSocketEvent';

import { useActiveWorkspace } from '../hooks/useActiveWorkspace';
import { useLeaveWorkspaceRoute } from '../hooks/useLeaveWorkspaceRoute';
import type { Workspace } from '../types';
import type { WorkspaceServerToClientEvents } from './types';

export function WorkspaceListRealtime() {
  const { identity } = useQueryAuth();
  const queryClient = useQueryClient();
  const { workspace } = useActiveWorkspace();
  const leaveWorkspaceRoute = useLeaveWorkspaceRoute();

  useSocketEvent<WorkspaceServerToClientEvents>('workspaces:changed', (event) => {
    if (!identity || event.type !== 'workspaces.workspace.deleted') return;
    const queryKey = ['workspaces', identity];

    queryClient.setQueryData<Workspace[]>(queryKey, (workspaces) =>
      workspaces?.filter(({ id }) => id !== event.workspaceId),
    );
    void queryClient.invalidateQueries({ queryKey });

    if (workspace?.id === event.workspaceId) leaveWorkspaceRoute();
  });

  return null;
}
