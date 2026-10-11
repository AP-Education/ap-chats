import { useWorkspaceMembers } from '@/features/workspaces/hooks/useWorkspaceMembers';
import type { WorkspaceMember } from '@/features/workspaces/types';

import { STAR_ME_SUBJECT } from '../types';

/** StarMe's membership in the workspace, while the workspace has it. */
export function useStarMe(workspaceId: string): WorkspaceMember | undefined {
  const { data: members } = useWorkspaceMembers(workspaceId);
  return members?.find((member) => member.profile.oidcUserId === STAR_ME_SUBJECT);
}
