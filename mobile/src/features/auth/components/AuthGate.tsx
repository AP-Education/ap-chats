import type { PropsWithChildren } from 'react';

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

  if (auth.status === 'unconfigured' || auth.status === 'signed-in') {
    return <>{children}</>;
  }

  if (auth.status === 'signing-in') {
    return <GateScreen icon="people" title="Заходимо" loading />;
  }

  if (auth.status === 'signing-out') {
    return <GateScreen icon="people" title="Виходимо" loading />;
  }

  if (auth.status === 'error' && auth.operation === 'sign-out') {
    return (
      <GateScreen
        icon="people"
        title="Не вдалося завершити вихід"
        description="Спробуй ще раз, щоб завершити вихід зі спільного акаунта AP."
        actions={[
          { label: 'Повторити вихід', onPress: () => void useAuthStore.getState().signOut() },
          {
            label: 'Увійти',
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
      title={auth.status === 'error' ? 'Не вдалося увійти' : 'Увійди в AP App'}
      description={
        auth.status === 'error'
          ? 'Спробуй ще раз за хвилину.'
          : 'Один клік через спільний акаунт AP, і ти в чаті з командою.'
      }
      detail={auth.status === 'error' ? auth.message : undefined}
      actions={[
        {
          label: auth.status === 'error' ? 'Спробувати ще раз' : 'Увійти',
          onPress: () => void useAuthStore.getState().signIn(),
        },
      ]}
    />
  );
}
