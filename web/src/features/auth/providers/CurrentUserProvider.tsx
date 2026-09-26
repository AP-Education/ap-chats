import type { PropsWithChildren } from 'react';

import { getAppShell } from '../../../lib/app-shell';
import { oidcConfigured } from '../api/oidc-config';
import { CurrentUserContext } from '../stores/current-user-context';
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
