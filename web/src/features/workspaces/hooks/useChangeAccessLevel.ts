import { useMutation, type UseMutationResult, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';

import { changeAccessLevel } from '../api/workspace-members-api';
import { workspaceQueryKeys } from '../queryKeys';
import type { WorkspaceAccessLevel, WorkspaceMember } from '../types';

interface AccessLevelChange {
  memberId: string;
  accessLevel: WorkspaceAccessLevel;
}

/** The workspace owner moves a person to another access level. */
export function useChangeAccessLevel(
  workspaceId: string,
): UseMutationResult<WorkspaceMember, Error, AccessLevelChange> {
  const { token, identity } = useQueryAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memberId, accessLevel }: AccessLevelChange) =>
      changeAccessLevel(token as string, workspaceId, memberId, accessLevel),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: workspaceQueryKeys.members(identity, workspaceId),
      });
    },
    onError: () => void message.error('Не вдалося змінити рівень доступу.'),
  });
}
