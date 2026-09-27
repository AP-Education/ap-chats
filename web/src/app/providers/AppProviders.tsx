import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';

import { UserProfileSync } from '../../features/auth/components/UserProfileSync/UserProfileSync';
import { CurrentUserProvider } from '../../features/auth/providers/CurrentUserProvider';
import { RealtimeProvider } from '../../features/realtime/providers/RealtimeProvider';
import { ActiveWorkspaceProvider } from '../../features/workspaces/providers/ActiveWorkspaceProvider';
import { ThemeProvider } from './ThemeProvider';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <CurrentUserProvider>
        <UserProfileSync />
        <RealtimeProvider>
          <ActiveWorkspaceProvider>
            <ThemeProvider>{children}</ThemeProvider>
          </ActiveWorkspaceProvider>
        </RealtimeProvider>
      </CurrentUserProvider>
    </QueryClientProvider>
  );
}
