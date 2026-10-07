import { getAppShell } from '@ap/shell-sdk';
import { CurrentUserContext } from '@ap/shell-sdk';
import type { PropsWithChildren } from 'react';

import { oidcConfigured } from '@/features/auth/api/oidc-config';

import { NativeCurrentUserProvider } from './NativeCurrentUserProvider';
import { OidcCurrentUserProvider } from './OidcCurrentUserProvider';
import { OidcProvider } from './OidcProvider';

export function CurrentUserProvider({ children }: PropsWithChildren) {
  const shell = getAppShell();

  if (shell.kind !== 'browser') {
    return <NativeCurrentUserProvider>{children}</NativeCurrentUserProvider>;
  }

  if (!oidcConfigured) {
    return (
      <CurrentUserContext.Provider value={{ status: 'unavailable' }}>
        {children}
      </CurrentUserContext.Provider>
    );
  }

  return (
    <OidcProvider>
      <OidcCurrentUserProvider>{children}</OidcCurrentUserProvider>
    </OidcProvider>
  );
}
