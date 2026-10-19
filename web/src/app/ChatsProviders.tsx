import { useBeforeSignOut } from '@ap-education/shell-sdk';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';

import { UserProfileSync } from '../features/auth/components/UserProfileSync/UserProfileSync';
import { ApiAuthSession } from '../features/auth/providers/ApiAuthSession';
import { CommunitiesProvider } from '../features/communities/providers/CommunitiesProvider';
import { NotificationsProvider } from '../features/notifications/providers/NotificationsProvider';
import { RealtimeProvider } from '../features/realtime/providers/RealtimeProvider';
import { PeopleProvider } from '../features/social/people/providers/PeopleProvider';
import { ActiveWorkspaceProvider } from '../features/workspaces/providers/ActiveWorkspaceProvider';
import { WorkspaceUnreadScope } from '../layouts/chats/WorkspaceUnreadScope';
import { persistQueries } from './query-persistence';
import { ShellRouter } from './ShellRouter';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

const forgetPersistedQueries = persistQueries(queryClient);

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
