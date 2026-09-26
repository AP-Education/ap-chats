import type { WorkspaceMember } from '@/features/workspaces/types';

import type { Channel } from './channels/types';

// Mirrors CommunityAccessService#requireManager on the backend: who may
// rename/delete a channel or remove someone else from it.
export function canManageChannel(channel: Channel, member: WorkspaceMember | undefined): boolean {
  if (!member) return false;
  if (channel.kind === 'private') return channel.isMember;
  return member.role === 'owner' || channel.createdByMemberId === member.id;
}
