import { useCurrentUser } from '@ap-education/shell-sdk';
import { useEffect } from 'react';

import { apiRequest, jsonInit } from '@/shared/api/http';
import type { ChatsLanguage } from '@/shared/i18n/i18n';
import { useChatsLanguage } from '@/shared/i18n/useChatsLanguage';

const synchronizedLocales = new Map<string, { locale: ChatsLanguage; request: Promise<void> }>();

/** Tells the server the person's language, so pushes reach them in it too. */
export function ProfileLocaleSync() {
  const user = useCurrentUser();
  const locale = useChatsLanguage();
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
  locale: ChatsLanguage;
}) {
  useEffect(() => {
    const previous = synchronizedLocales.get(identity);
    if (previous?.locale === locale) return;

    const request = (previous?.request.catch(() => undefined) ?? Promise.resolve()).then(() =>
      apiRequest<void>('/api/user-profile/me/locale', accessToken, jsonInit('PUT', { locale })),
    );
    synchronizedLocales.set(identity, { locale, request });
    void request.catch(() => {
      if (synchronizedLocales.get(identity)?.request === request)
        synchronizedLocales.delete(identity);
    });
  }, [accessToken, identity, locale]);

  return null;
}
