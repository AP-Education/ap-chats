import { useBeforeSignOut, useMobileMenu } from '@ap-education/shell-sdk';
import { SheetDismissal } from '@ap-education/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';

import { I18nProvider } from '@/shared/i18n/I18nProvider';

import { ProfileLocaleSync } from '../features/auth/components/ProfileLocaleSync/ProfileLocaleSync';
import { UserProfileSync } from '../features/auth/components/UserProfileSync/UserProfileSync';
import { ApiAuthSession } from '../features/auth/providers/ApiAuthSession';
import { CommunitiesProvider } from '../features/communities/providers/CommunitiesProvider';
import { NotificationsProvider } from '../features/notifications/providers/NotificationsProvider';
import { RealtimeProvider } from '../features/realtime/providers/RealtimeProvider';
import { OutboxesProvider } from '../features/social/messaging/sending/providers/OutboxesProvider';
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
  const { isOpen: isMenuOpen } = useMobileMenu();

  return (
    // The shell's menu slides over the page, so a sheet left open would float above it.
    <SheetDismissal isDismissed={isMenuOpen}>
      <ShellRouter>
        <I18nProvider>
          <QueryClientProvider client={queryClient}>
            <ApiAuthSession />
            <UserProfileSync />
            <ProfileLocaleSync />
            <RealtimeProvider>
              <ActiveWorkspaceProvider>
                <WorkspaceUnreadScope>
                  <CommunitiesProvider>
                    <PeopleProvider>
                      <OutboxesProvider>
                        <NotificationsProvider>{children}</NotificationsProvider>
                      </OutboxesProvider>
                    </PeopleProvider>
                  </CommunitiesProvider>
                </WorkspaceUnreadScope>
              </ActiveWorkspaceProvider>
            </RealtimeProvider>
          </QueryClientProvider>
        </I18nProvider>
      </ShellRouter>
    </SheetDismissal>
  );
}
