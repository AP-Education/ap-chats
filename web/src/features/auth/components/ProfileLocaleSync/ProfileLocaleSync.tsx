import { type ShellLocale, useCurrentUser, useShellLocale } from '@ap-education/shell-sdk';
import { useEffect } from 'react';

import { apiRequest, jsonInit } from '@/shared/api/http';

const synchronizedLocales = new Set<string>();

/** Tells the server the person's language, so pushes reach them in it too. */
export function ProfileLocaleSync() {
  const user = useCurrentUser();
  const locale = useShellLocale();
  if (user.status !== 'signed-in') return null;

  return (
    <SignedInLocaleSync
      accessToken={user.accessToken}
      identity={user.queryIdentity}
      locale={locale}
    />
  );
}

function SignedInLocaleSync({
  accessToken,
  identity,
  locale,
}: {
  accessToken: string;
  identity: string;
  locale: ShellLocale;
}) {
  useEffect(() => {
    const synchronized = `${identity}:${locale}`;
    if (synchronizedLocales.has(synchronized)) return;

    synchronizedLocales.add(synchronized);
    void apiRequest<void>(
      '/api/user-profile/me/locale',
      accessToken,
      jsonInit('PUT', { locale }),
    ).catch(() => synchronizedLocales.delete(synchronized));
  }, [accessToken, identity, locale]);

  return null;
}
