import { isAdministrator } from '@/components/workspaces/access';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import type { ChannelView, ListedChannel } from './types';

export function channelView(viewer: WorkspaceMember, channel: ListedChannel): ChannelView {
  const { listed, ...details } = channel;
  return {
    ...details,
    isMember: listed !== null,
    canPost: listed?.canPost ?? false,
    canManage: (listed?.canManage ?? false) || isAdministrator(viewer),
  };
}
