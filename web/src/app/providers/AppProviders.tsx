import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';

import { CurrentUserProvider } from '../../features/auth/providers/CurrentUserProvider';
import { ConnectProvider } from '../../features/realtime/providers/ConnectProvider';
import { ThemeProvider } from './ThemeProvider';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <CurrentUserProvider>
        <ConnectProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </ConnectProvider>
      </CurrentUserProvider>
    </QueryClientProvider>
  );
}
