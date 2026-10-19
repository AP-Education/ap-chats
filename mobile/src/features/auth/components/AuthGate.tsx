import type { PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';

import { GateScreen } from '../../../components/GateScreen';
import { useAuthStore } from '../index';

/**
 * Owns sign-in for the mobile shell. Unlike web/src/features/auth/components/AuthStatus.tsx
 * (a button inside the app), the WebView can't safely drive a system-browser redirect
 * itself, so the native shell logs in first and only then reveals the WebView, feeding
 * it a token through the bridge (see features/webview). A no-op passthrough when OIDC
 * isn't configured yet, matching how web/src/features/auth/providers/OidcProvider.tsx
 * degrades today.
 */
export function AuthGate({ children }: PropsWithChildren) {
  const auth = useAuthStore();
  const { t } = useTranslation('auth');

  if (auth.status === 'unconfigured' || auth.status === 'signed-in') {
    return <>{children}</>;
  }

  if (auth.status === 'signing-in') {
    return <GateScreen icon="people" title={t(($) => $.signingIn)} loading />;
  }

  if (auth.status === 'signing-out') {
    return <GateScreen icon="people" title={t(($) => $.signingOut)} loading />;
  }

  if (auth.status === 'error' && auth.operation === 'sign-out') {
    return (
      <GateScreen
        icon="people"
        title={t(($) => $.signOutFailed.title)}
        description={t(($) => $.signOutFailed.description)}
        actions={[
          {
            label: t(($) => $.signOutFailed.retry),
            onPress: () => void useAuthStore.getState().signOut(),
          },
          {
            label: t(($) => $.signOutFailed.signIn),
            variant: 'secondary',
            onPress: () => void useAuthStore.getState().signIn(),
          },
        ]}
      />
    );
  }

  return (
    <GateScreen
      icon="people"
      title={auth.status === 'error' ? t(($) => $.signInFailed.title) : t(($) => $.signIn.title)}
      description={
        auth.status === 'error'
          ? t(($) => $.signInFailed.description)
          : t(($) => $.signIn.description)
      }
      detail={auth.status === 'error' ? auth.message : undefined}
      actions={[
        {
          label:
            auth.status === 'error' ? t(($) => $.signInFailed.retry) : t(($) => $.signIn.action),
          onPress: () => void useAuthStore.getState().signIn(),
        },
      ]}
    />
  );
}
