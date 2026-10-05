import type { WorkspaceMember } from '@/features/workspaces/types';

import type { Channel } from './channels/types';

export function canManageChannel(channel: Channel, member: WorkspaceMember | undefined): boolean {
  return member?.role === 'owner' && (channel.kind === 'public' || channel.isMember);
}
