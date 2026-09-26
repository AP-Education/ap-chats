import { useMutation, type UseMutationResult, useQueryClient } from '@tanstack/react-query';

import { useQueryAuth } from '../../auth/hooks/useQueryAuth';
import { updateWorkspace } from '../api/workspaces-api';
import type { UpdateWorkspaceInput, Workspace } from '../types';

interface UpdateWorkspaceParams {
  workspaceId: string;
  input: UpdateWorkspaceInput;
}

export function useUpdateWorkspace(): UseMutationResult<Workspace, Error, UpdateWorkspaceParams> {
  const { token, identity } = useQueryAuth();
  const queryClient = useQueryClient();
  const queryKey = ['workspaces', identity];

  return useMutation({
    mutationFn: ({ workspaceId, input }: UpdateWorkspaceParams) => {
      if (!token) throw new Error('Not signed in');
      return updateWorkspace(token, workspaceId, input);
    },
    onMutate: async ({ workspaceId, input }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Workspace[]>(queryKey);
      queryClient.setQueryData<Workspace[]>(queryKey, (workspaces) =>
        workspaces?.map((workspace) =>
          workspace.id === workspaceId ? { ...workspace, ...input } : workspace,
        ),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<Workspace[]>(queryKey, (workspaces) =>
        workspaces?.map((workspace) => (workspace.id === updated.id ? updated : workspace)),
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });
}
