import { useWorkspaceUnreadStore } from '../../features/social/read-state/workspace-unread-context';
import { NavBadge } from './NavBadge';

export function DirectMessagesNavBadge() {
  const { directTotal } = useWorkspaceUnreadStore();
  return <NavBadge count={directTotal} />;
}
