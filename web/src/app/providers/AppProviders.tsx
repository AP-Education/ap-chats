import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';

import { CurrentUserProvider } from '../../features/auth/providers/CurrentUserProvider';
import { ThemeProvider } from './ThemeProvider';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <CurrentUserProvider>
        <ThemeProvider>{children}</ThemeProvider>
      </CurrentUserProvider>
    </QueryClientProvider>
  );
}
