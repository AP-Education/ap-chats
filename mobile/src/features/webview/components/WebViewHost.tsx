import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebView, { type WebViewMessageEvent } from 'react-native-webview';

import { useAuthStore } from '../../auth/index';
import type { NativeToWebMessage, WebToNativeMessage } from '../types';
import { buildBridgeScript } from '../utils/inject-bridge';
import { APP_SHELL_USER_AGENT } from '../utils/shell-user-agent';
import { SetupScreen } from './SetupScreen';

const webUrl = process.env.EXPO_PUBLIC_WEB_URL;

export function WebViewHost() {
  const webViewRef = useRef<WebView>(null);
  const auth = useAuthStore();
  // injectJavaScript silently drops calls made before the page has actually finished
  // loading (no JS context to run in yet) — this counts WebView loads (initial + any
  // reload) so the effect below only fires once there's a page to inject into, and
  // re-fires on every reload since the injected globals don't survive one.
  const [loadCount, setLoadCount] = useState(0);

  // The WebView never fetches or refreshes its own token — AuthStore does that
  // natively (including while the WebView is backgrounded) and this just forwards the
  // result. web/src/app/auth/useNativeAuthBridge.ts is the receiving end.
  useEffect(() => {
    if (loadCount === 0) return;

    let message: NativeToWebMessage;
    if (auth.status === 'signed-in') {
      message = {
        type: 'auth/token',
        payload: {
          accessToken: auth.tokens.accessToken,
          expiresAt: auth.tokens.expiresAt,
          idToken: auth.tokens.idToken,
        },
      };
    } else if (auth.status === 'unconfigured') {
      // AuthGate never reveals the WebView except for 'unconfigured' and 'signed-in' (see
      // AuthGate.tsx), so this is the only other status reachable here — tell web/ not to
      // wait for a token that is never coming, instead of spinning its header forever.
      message = { type: 'auth/unavailable' };
    } else {
      return;
    }
    webViewRef.current?.injectJavaScript(buildBridgeScript(message));
  }, [auth, loadCount]);

  function handleMessage(event: WebViewMessageEvent) {
    let message: WebToNativeMessage;
    try {
      message = JSON.parse(event.nativeEvent.data) as WebToNativeMessage;
    } catch {
      return;
    }
    if (message.type === 'auth/sign-out') {
      void useAuthStore.getState().signOut();
    }
  }

  if (!webUrl) {
    return <SetupScreen />;
  }

  return (
    // Keeps the WebView clear of the notch/Dynamic Island and the home indicator — the
    // WebView is a plain native UIView and won't respect safe-area insets on its own the
    // way a native screen or a web page with env(safe-area-inset-*) would.
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <WebView
        ref={webViewRef}
        source={{ uri: webUrl }}
        style={styles.webview}
        applicationNameForUserAgent={APP_SHELL_USER_AGENT}
        onMessage={handleMessage}
        onLoadEnd={() => setLoadCount((count) => count + 1)}
      />
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  webview: { flex: 1 },
});
