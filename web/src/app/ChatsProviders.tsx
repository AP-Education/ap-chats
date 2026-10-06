import { useAppBadge } from '@ap/shell-sdk';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type PropsWithChildren, useContext } from 'react';

import { UserProfileSync } from '../features/auth/components/UserProfileSync/UserProfileSync';
import { ApiAuthSession } from '../features/auth/providers/ApiAuthSession';
import { ChannelListRealtime } from '../features/communities/realtime/ChannelListRealtime';
import { RealtimeProvider } from '../features/realtime/providers/RealtimeProvider';
import { WorkspaceUnreadContext } from '../features/social/read-state/workspace-unread-context';
import { ActiveWorkspaceProvider } from '../features/workspaces/providers/ActiveWorkspaceProvider';
import { WorkspaceUnreadScope } from '../layouts/chats/WorkspaceUnreadScope';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

function UnreadBadge() {
  const unread = useContext(WorkspaceUnreadContext);
  useAppBadge((unread?.channelTotal ?? 0) + (unread?.directTotal ?? 0));
  return null;
}

/** Long-lived state of the Chats application: data and realtime. Mounted while Chats is cached. */
export function ChatsProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <ApiAuthSession />
      <UserProfileSync />
      <RealtimeProvider>
        <ChannelListRealtime />
        <ActiveWorkspaceProvider>
          <WorkspaceUnreadScope>
            <UnreadBadge />
            {children}
          </WorkspaceUnreadScope>
        </ActiveWorkspaceProvider>
      </RealtimeProvider>
    </QueryClientProvider>
  );
}
