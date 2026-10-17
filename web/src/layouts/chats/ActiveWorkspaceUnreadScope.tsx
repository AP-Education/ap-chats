import { type ReactNode, useCallback, useMemo, useState } from 'react';

import {
  useSnoozeWakeUp,
  useWorkspaceNotify,
} from '../../features/communities/notifications/hooks/useWorkspaceNotifications';
import { useUnreadDirectMessages } from '../../features/social/direct-messages/hooks/useUnreadDirectMessages';
import { UnreadDirectMessagesContext } from '../../features/social/direct-messages/unread-direct-messages-context';
import { useMessageNotificationSound } from '../../features/social/read-state/hooks/useMessageNotificationSound';
import { useWorkspacesReadState } from '../../features/social/read-state/hooks/useWorkspacesReadState';
import { useWorkspaceUnread } from '../../features/social/read-state/hooks/useWorkspaceUnread';
import { WorkspaceChannelContext } from '../../features/social/read-state/workspace-channel-context';
import {
  createWorkspaceUnreadStore,
  WorkspaceUnreadContext,
} from '../../features/social/read-state/workspace-unread-context';
import { WorkspaceUnreadSync } from '../../features/social/read-state/WorkspaceUnreadSync';

export function ActiveWorkspaceUnreadScope({
  workspaceId,
  otherWorkspaceIds,
  children,
}: {
  workspaceId: string;
  otherWorkspaceIds: string[];
  children: ReactNode;
}) {
  const [openChannelId, setOpenChannelId] = useState<string>();
  const register = useCallback((channelId: string) => {
    setOpenChannelId(channelId);
    return () => setOpenChannelId((current) => (current === channelId ? undefined : current));
  }, []);
  const registration = useMemo(() => ({ register }), [register]);
  const conversations = useWorkspaceUnread(workspaceId);
  const notifyByChannel = useWorkspaceNotify(workspaceId);
  const elsewhere = useWorkspacesReadState(otherWorkspaceIds);
  const directUnread = useUnreadDirectMessages(workspaceId);
  useSnoozeWakeUp(workspaceId);
  useMessageNotificationSound(openChannelId);
  const channelsStore = useMemo(
    () =>
      createWorkspaceUnreadStore({ conversations: conversations.data, notifyByChannel }, elsewhere),
    [conversations.data, notifyByChannel, elsewhere],
  );

  return (
    <WorkspaceChannelContext.Provider value={registration}>
      {otherWorkspaceIds.map((otherId) => (
        <WorkspaceUnreadSync key={otherId} workspaceId={otherId} />
      ))}
      <WorkspaceUnreadContext.Provider value={channelsStore}>
        <UnreadDirectMessagesContext.Provider value={directUnread}>
          {children}
        </UnreadDirectMessagesContext.Provider>
      </WorkspaceUnreadContext.Provider>
    </WorkspaceChannelContext.Provider>
  );
}
