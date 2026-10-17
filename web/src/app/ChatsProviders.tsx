import { useAppBadge, useBeforeSignOut, useTabBadge } from '@ap-education/shell-sdk';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type PropsWithChildren, useContext } from 'react';

import { UserProfileSync } from '../features/auth/components/UserProfileSync/UserProfileSync';
import { ApiAuthSession } from '../features/auth/providers/ApiAuthSession';
import { CommunitiesProvider } from '../features/communities/providers/CommunitiesProvider';
import { NotificationsProvider } from '../features/notifications/providers/NotificationsProvider';
import { RealtimeProvider } from '../features/realtime/providers/RealtimeProvider';
import { PeopleProvider } from '../features/social/people/providers/PeopleProvider';
import { WorkspaceUnreadContext } from '../features/social/read-state/workspace-unread-context';
import { ActiveWorkspaceProvider } from '../features/workspaces/providers/ActiveWorkspaceProvider';
import { personalTab, teamTab } from '../layouts/chats/sections';
import { WorkspaceUnreadScope } from '../layouts/chats/WorkspaceUnreadScope';
import { persistQueries } from './query-persistence';
import { ShellRouter } from './ShellRouter';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

const forgetPersistedQueries = persistQueries(queryClient);

// Every workspace counts: what is meant for the person anywhere reaches the app and its tabs.
function UnreadBadges() {
  const unread = useContext(WorkspaceUnreadContext);
  const team = (unread?.channels.badge ?? 0) + (unread?.channelsElsewhere.badge ?? 0);
  const personal = unread?.direct.badge ?? 0;
  useAppBadge(team + personal);
  useTabBadge(teamTab.id, team);
  useTabBadge(personalTab.id, personal);
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
          <ActiveWorkspaceProvider>
            <WorkspaceUnreadScope>
              <UnreadBadges />
              <CommunitiesProvider>
                <PeopleProvider>
                  <NotificationsProvider>{children}</NotificationsProvider>
                </PeopleProvider>
              </CommunitiesProvider>
            </WorkspaceUnreadScope>
          </ActiveWorkspaceProvider>
        </RealtimeProvider>
      </QueryClientProvider>
    </ShellRouter>
  );
}
