import { useCurrentUser } from '@ap/shell-sdk';
import { useMemo } from 'react';

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
    for (const member of members ?? []) {
      const isSelf = member.profile.oidcUserId === sub;
      const label = member.profile.displayName ?? 'Ім’я недоступне';
      map.set(member.id, { member, isSelf, label });
    }
    return map;
  }, [members, sub]);

  const currentMember = members?.find((candidate) => candidate.profile.oidcUserId === sub);

  return {
    byId,
    currentMember,
    isLoading,
    isError: isError && !members,
    retry: () => void refetch(),
  };
}
