import { useMutation, type UseMutationResult, useQueryClient } from '@tanstack/react-query';

import { useCurrentUser } from '../../auth/stores/current-user-context';
import { updateWorkspace } from '../api/workspaces-api';
import type { UpdateWorkspaceInput, Workspace } from '../types';

interface UpdateWorkspaceParams {
  workspaceId: string;
  input: UpdateWorkspaceInput;
}

export function useUpdateWorkspace(): UseMutationResult<Workspace, Error, UpdateWorkspaceParams> {
  const user = useCurrentUser();
  const token = user.status === 'signed-in' ? user.accessToken : undefined;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, input }: UpdateWorkspaceParams) => {
      if (!token) throw new Error('Not signed in');
      return updateWorkspace(token, workspaceId, input);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}
