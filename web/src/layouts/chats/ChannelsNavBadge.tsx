import { useWorkspaceUnreadStore } from '../../features/social/read-state/workspace-unread-context';
import { NavBadge } from './NavBadge';

export function ChannelsNavBadge() {
  const { channelTotal } = useWorkspaceUnreadStore();
  return <NavBadge count={channelTotal} />;
}
