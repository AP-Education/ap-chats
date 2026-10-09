import { useAppBadge, useBeforeSignOut } from '@ap-education/shell-sdk';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type PropsWithChildren, useContext } from 'react';

import { UserProfileSync } from '../features/auth/components/UserProfileSync/UserProfileSync';
import { ApiAuthSession } from '../features/auth/providers/ApiAuthSession';
import { ChannelListRealtime } from '../features/communities/realtime/ChannelListRealtime';
import { AttentionReporter } from '../features/notifications/components/AttentionReporter';
import { NotificationDismissal } from '../features/notifications/components/NotificationDismissal';
import { PushNavigation } from '../features/notifications/components/PushNavigation';
import { PushSubscriptionSync } from '../features/notifications/components/PushSubscriptionSync';
import { RealtimeProvider } from '../features/realtime/providers/RealtimeProvider';
import { WorkspaceUnreadContext } from '../features/social/read-state/workspace-unread-context';
import { ActiveWorkspaceProvider } from '../features/workspaces/providers/ActiveWorkspaceProvider';
import { WorkspaceListRealtime } from '../features/workspaces/realtime/WorkspaceListRealtime';
import { WorkspaceUnreadScope } from '../layouts/chats/WorkspaceUnreadScope';
import { persistQueries } from './query-persistence';
import { ShellRouter } from './ShellRouter';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

const forgetPersistedQueries = persistQueries(queryClient);

function UnreadBadge() {
  const unread = useContext(WorkspaceUnreadContext);
  useAppBadge((unread?.channelTotal ?? 0) + (unread?.directTotal ?? 0));
  return null;
}

/** Long-lived state of the Chats application: data and realtime. Mounted while Chats is cached. */
export function ChatsProviders({ children }: PropsWithChildren) {
  useBeforeSignOut(forgetPersistedQueries);

  return (
    <ShellRouter>
      <QueryClientProvider client={queryClient}>
        <ApiAuthSession />
        <UserProfileSync />
        <RealtimeProvider>
          <ChannelListRealtime />
          <ActiveWorkspaceProvider>
            <WorkspaceListRealtime />
            <WorkspaceUnreadScope>
              <UnreadBadge />
              <PushSubscriptionSync />
              <AttentionReporter />
              <NotificationDismissal />
              <PushNavigation>{children}</PushNavigation>
            </WorkspaceUnreadScope>
          </ActiveWorkspaceProvider>
        </RealtimeProvider>
      </QueryClientProvider>
    </ShellRouter>
  );
}
