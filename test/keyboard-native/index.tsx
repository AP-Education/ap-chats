import { registerRootComponent } from 'expo';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';

import { authRestored, useAuthStore } from '../../mobile/src/features/auth';
import { WebViewHost } from '../../mobile/src/features/webview/components/WebViewHost';
import { AppProviders } from '../../mobile/src/shell/AppProviders';

function KeyboardQA() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    void authRestored.then(() => {
      if (!active) return;

      useAuthStore.setState({
        status: 'signed-in',
        tokens: { accessToken: 'fixture-only', expiresAt: Date.now() + 3_600_000 },
      });
      setReady(true);
      void SplashScreen.hideAsync();
    });
    return () => {
      active = false;
    };
  }, []);

  return ready ? (
    <AppProviders>
      <WebViewHost />
    </AppProviders>
  ) : null;
}

registerRootComponent(KeyboardQA);
