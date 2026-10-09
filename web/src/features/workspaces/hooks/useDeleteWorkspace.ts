import { useMutation, type UseMutationResult, useQueryClient } from '@tanstack/react-query';

import { useQueryAuth } from '../../auth/hooks/useQueryAuth';
import { deleteWorkspace } from '../api/workspaces-api';
import type { Workspace } from '../types';

export function useDeleteWorkspace(): UseMutationResult<void, Error, string> {
  const { token, identity } = useQueryAuth();
  const queryClient = useQueryClient();
  const queryKey = ['workspaces', identity];

  return useMutation({
    mutationFn: (workspaceId: string) => {
      if (!token) throw new Error('Not signed in');
      return deleteWorkspace(token, workspaceId);
    },
    onSuccess: (_result, workspaceId) => {
      queryClient.setQueryData<Workspace[]>(queryKey, (workspaces) =>
        workspaces?.filter((workspace) => workspace.id !== workspaceId),
      );
      void queryClient.invalidateQueries({ queryKey });
    },
  });
}
