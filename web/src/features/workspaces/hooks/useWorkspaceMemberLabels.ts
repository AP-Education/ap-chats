import { useCurrentUser } from '@ap-education/shell-sdk';
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
  bySub: Map<string, WorkspaceMemberLabel>;
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

  const { byId, bySub } = useMemo(() => {
    const byId = new Map<string, WorkspaceMemberLabel>();
    const bySub = new Map<string, WorkspaceMemberLabel>();
    for (const member of members ?? []) {
      const isSelf = member.profile.oidcUserId === sub;
      const label = member.profile.displayName ?? 'Ім’я недоступне';
      const entry = { member, isSelf, label };
      byId.set(member.id, entry);
      bySub.set(member.profile.oidcUserId, entry);
    }
    return { byId, bySub };
  }, [members, sub]);

  const currentMember = members?.find((candidate) => candidate.profile.oidcUserId === sub);

  return {
    byId,
    bySub,
    currentMember,
    isLoading,
    isError: isError && !members,
    retry: () => void refetch(),
  };
}
