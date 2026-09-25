import { useMutation, type UseMutationResult, useQueryClient } from '@tanstack/react-query';

import { useCurrentUser } from '../../auth/stores/current-user-context';
import { createWorkspace } from '../api/workspaces-api';
import type { CreateWorkspaceInput, Workspace } from '../types';

export function useCreateWorkspace(): UseMutationResult<Workspace, Error, CreateWorkspaceInput> {
  const user = useCurrentUser();
  const token = user.status === 'signed-in' ? user.accessToken : undefined;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateWorkspaceInput) => {
      if (!token) throw new Error('Not signed in');
      return createWorkspace(token, input);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}
