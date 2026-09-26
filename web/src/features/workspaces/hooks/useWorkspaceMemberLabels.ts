import { useMemo } from 'react';

import { useCurrentUser } from '@/features/auth/stores/current-user-context';

import type { WorkspaceMember } from '../types';
import { useWorkspaceMembers } from './useWorkspaceMembers';

export interface WorkspaceMemberLabel {
  member: WorkspaceMember;
  isSelf: boolean;
  label: string;
}

interface WorkspaceMemberLabelsResult {
  byId: Map<string, WorkspaceMemberLabel>;
  /** The signed-in user's own workspace_members row, for permission checks. */
  currentMember: WorkspaceMember | undefined;
  isLoading: boolean;
  isError: boolean;
  retry: () => void;
}

export function useWorkspaceMemberLabels(
  workspaceId: string | undefined,
): WorkspaceMemberLabelsResult {
  const user = useCurrentUser();
  const sub = user.status === 'signed-in' ? user.profile?.sub : undefined;
  const { data: members, isLoading, isError, refetch } = useWorkspaceMembers(workspaceId);

  const byId = useMemo(() => {
    const map = new Map<string, WorkspaceMemberLabel>();
    const sorted = [...(members ?? [])].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    let ordinal = 0;
    for (const member of sorted) {
      const isSelf = member.userId === sub;
      if (member.role !== 'owner') ordinal += 1;
      const label =
        member.role === 'owner'
          ? 'Власник робочого простору'
          : isSelf
            ? 'Ви'
            : `Учасник ${ordinal}`;
      map.set(member.id, { member, isSelf, label });
    }
    return map;
  }, [members, sub]);

  const currentMember = members?.find((candidate) => candidate.userId === sub);

  return {
    byId,
    currentMember,
    isLoading,
    isError: isError && !members,
    retry: () => void refetch(),
  };
}
