import { useAppBadge, useBeforeSignOut, useTabBadge } from '@ap-education/shell-sdk';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type PropsWithChildren, useContext } from 'react';

import { ProfileLocaleSync } from '../features/auth/components/ProfileLocaleSync/ProfileLocaleSync';
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
import { I18nProvider } from '../shared/i18n/I18nProvider';
import { persistQueries } from './query-persistence';
import { ShellRouter } from './ShellRouter';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

const forgetPersistedQueries = persistQueries(queryClient);

function UnreadBadges() {
  const unread = useContext(WorkspaceUnreadContext);
  const channelTotal = unread?.channelTotal ?? 0;
  const directTotal = unread?.directTotal ?? 0;
  useAppBadge(channelTotal + directTotal);
  useTabBadge(teamTab.id, channelTotal);
  useTabBadge(personalTab.id, directTotal);
  return null;
}

/** Long-lived state of the Chats application: language, data and realtime. Mounted while Chats is cached. */
export function ChatsProviders({ children }: PropsWithChildren) {
  useBeforeSignOut(forgetPersistedQueries);

  return (
    <I18nProvider>
      <ShellRouter>
        <QueryClientProvider client={queryClient}>
          <ApiAuthSession />
          <UserProfileSync />
          <ProfileLocaleSync />
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
    </I18nProvider>
  );
}
