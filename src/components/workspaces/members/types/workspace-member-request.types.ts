import type { AuthenticatedRequest } from '@/components/auth';

import type { WorkspaceMember } from './workspace-member.types';

export type WorkspaceMemberRequest = AuthenticatedRequest & {
  workspaceMember?: WorkspaceMember;
};
