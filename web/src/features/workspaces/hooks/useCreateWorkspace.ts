import { useMutation, type UseMutationResult, useQueryClient } from '@tanstack/react-query';

import { useQueryAuth } from '../../auth/hooks/useQueryAuth';
import { createWorkspace } from '../api/workspaces-api';
import type { CreateWorkspaceInput, Workspace } from '../types';

export function useCreateWorkspace(): UseMutationResult<Workspace, Error, CreateWorkspaceInput> {
  const { token, identity } = useQueryAuth();
  const queryClient = useQueryClient();
  const queryKey = ['workspaces', identity];

  return useMutation({
    mutationFn: (input: CreateWorkspaceInput) => {
      if (!token) throw new Error('Not signed in');
      return createWorkspace(token, input);
    },
    onSuccess: (workspace) => {
      queryClient.setQueryData<Workspace[]>(queryKey, (workspaces) =>
        workspaces ? [...workspaces, workspace] : [workspace],
      );
      void queryClient.invalidateQueries({ queryKey });
    },
  });
}
