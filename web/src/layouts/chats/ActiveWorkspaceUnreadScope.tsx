import { type ReactNode, useCallback, useMemo, useState } from 'react';

import { useUnreadDirectMessages } from '../../features/social/direct-messages/hooks/useUnreadDirectMessages';
import { UnreadDirectMessagesContext } from '../../features/social/direct-messages/unread-direct-messages-context';
import { useDirectUnreadElsewhere } from '../../features/social/read-state/hooks/useDirectUnreadElsewhere';
import { useMessageNotificationSound } from '../../features/social/read-state/hooks/useMessageNotificationSound';
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
  const channelsUnread = useWorkspaceUnread(workspaceId);
  const directUnreadElsewhere = useDirectUnreadElsewhere(otherWorkspaceIds);
  const directUnread = useUnreadDirectMessages(workspaceId);
  useMessageNotificationSound(openChannelId);
  const channelsStore = useMemo(
    () => createWorkspaceUnreadStore(channelsUnread.data, directUnreadElsewhere),
    [channelsUnread.data, directUnreadElsewhere],
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
