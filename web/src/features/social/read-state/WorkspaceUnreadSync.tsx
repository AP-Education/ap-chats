import { useSnoozeWakeUp } from '@/features/communities/notifications/hooks/useWorkspaceNotifications';

import { useWorkspaceUnread } from './hooks/useWorkspaceUnread';

export function WorkspaceUnreadSync({ workspaceId }: { workspaceId: string }) {
  useWorkspaceUnread(workspaceId);
  useSnoozeWakeUp(workspaceId);
  return null;
}
