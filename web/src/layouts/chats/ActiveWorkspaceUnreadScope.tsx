import { useAppBadge, useTabBadge } from '@ap-education/shell-sdk';
import { type ReactNode, useCallback, useMemo, useState } from 'react';

import { useMutedConversations } from '../../features/communities/notifications/hooks/useMutedConversations';
import { useUnreadDirectMessages } from '../../features/social/direct-messages/hooks/useUnreadDirectMessages';
import { UnreadDirectMessagesContext } from '../../features/social/direct-messages/unread-direct-messages-context';
import { useMessageNotificationSound } from '../../features/social/read-state/hooks/useMessageNotificationSound';
import { useWorkspacesUnread } from '../../features/social/read-state/hooks/useWorkspacesUnread';
import { WorkspaceChannelContext } from '../../features/social/read-state/workspace-channel-context';
import {
  createWorkspaceUnreadStore,
  WorkspaceUnreadContext,
} from '../../features/social/read-state/workspace-unread-context';
import { WorkspaceUnreadSync } from '../../features/social/read-state/WorkspaceUnreadSync';
import { personalTab, teamTab } from './sections';

// Every workspace counts: what is meant for the person anywhere reaches the app and its tabs.
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
  const workspaceIds = useMemo(
    () => [workspaceId, ...otherWorkspaceIds],
    [workspaceId, otherWorkspaceIds],
  );
  const workspaces = useWorkspacesUnread(workspaceIds);
  const mutedChannelIds = useMutedConversations(workspaceIds);
  const directUnread = useUnreadDirectMessages(workspaceId);
  useMessageNotificationSound(openChannelId);
  const unread = useMemo(
    () => createWorkspaceUnreadStore(workspaceId, workspaces, mutedChannelIds),
    [workspaceId, workspaces, mutedChannelIds],
  );
  useAppBadge(unread.channels.badge + unread.direct.badge);
  useTabBadge(teamTab.id, unread.channels.badge);
  useTabBadge(personalTab.id, unread.direct.badge);

  return (
    <WorkspaceChannelContext.Provider value={registration}>
      {workspaceIds.map((id) => (
        <WorkspaceUnreadSync key={id} workspaceId={id} />
      ))}
      <WorkspaceUnreadContext.Provider value={unread}>
        <UnreadDirectMessagesContext.Provider value={directUnread}>
          {children}
        </UnreadDirectMessagesContext.Provider>
      </WorkspaceUnreadContext.Provider>
    </WorkspaceChannelContext.Provider>
  );
}
