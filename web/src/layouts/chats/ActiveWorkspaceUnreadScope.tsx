import { type ReactNode, useCallback, useMemo, useState } from 'react';

import { useUnreadDirectMessages } from '../../features/social/direct-messages/hooks/useUnreadDirectMessages';
import { UnreadDirectMessagesContext } from '../../features/social/direct-messages/unread-direct-messages-context';
import { useMessageNotificationSound } from '../../features/social/read-state/hooks/useMessageNotificationSound';
import { useWorkspaceUnread } from '../../features/social/read-state/hooks/useWorkspaceUnread';
import { WorkspaceChannelContext } from '../../features/social/read-state/workspace-channel-context';
import {
  createWorkspaceUnreadStore,
  WorkspaceUnreadContext,
} from '../../features/social/read-state/workspace-unread-context';

export function ActiveWorkspaceUnreadScope({
  workspaceId,
  children,
}: {
  workspaceId: string;
  children: ReactNode;
}) {
  const [openChannelId, setOpenChannelId] = useState<string>();
  const register = useCallback((channelId: string) => {
    setOpenChannelId(channelId);
    return () => setOpenChannelId((current) => (current === channelId ? undefined : current));
  }, []);
  const registration = useMemo(() => ({ register }), [register]);
  const channelsUnread = useWorkspaceUnread(workspaceId);
  const directUnread = useUnreadDirectMessages(workspaceId);
  useMessageNotificationSound(workspaceId, openChannelId);
  const channelsStore = useMemo(
    () => createWorkspaceUnreadStore(channelsUnread.data),
    [channelsUnread.data],
  );

  return (
    <WorkspaceChannelContext.Provider value={registration}>
      <WorkspaceUnreadContext.Provider value={channelsStore}>
        <UnreadDirectMessagesContext.Provider value={directUnread}>
          {children}
        </UnreadDirectMessagesContext.Provider>
      </WorkspaceUnreadContext.Provider>
    </WorkspaceChannelContext.Provider>
  );
}
