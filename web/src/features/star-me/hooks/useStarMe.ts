import { useMemo } from 'react';

import { useWorkspaceMembers } from '@/features/workspaces/hooks/useWorkspaceMembers';
import type { MemberSummary } from '@/features/workspaces/types';

import { STAR_ME_SUBJECT } from '../types';

/** StarMe as a member of the workspace, while the workspace has it. */
export function useStarMe(workspaceId: string): MemberSummary | undefined {
  const { data: members } = useWorkspaceMembers(workspaceId);

  return useMemo(() => {
    const starMe = members?.find((member) => member.profile.oidcUserId === STAR_ME_SUBJECT);
    if (!starMe) return undefined;

    const { displayName, avatarPath, isBot } = starMe.profile;
    return { memberId: starMe.id, displayName, avatarPath, isBot };
  }, [members]);
}
