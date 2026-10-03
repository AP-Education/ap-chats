import { selectionAsync } from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { AppState, Keyboard, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebView, { type WebViewMessageEvent } from 'react-native-webview';
import type {
  WebViewErrorEvent,
  WebViewHttpErrorEvent,
  WebViewTerminatedEvent,
} from 'react-native-webview/lib/WebViewTypes';

import { useAuthStore } from '../../auth/index';
import { connectBridgedCall, useIsMiniCallBarVisible } from '../../calls';
import { unregisterCurrentDevice } from '../../push/api/unregister-current-device';
import { MessageNotificationSound } from '../../push/components/MessageNotificationSound';
import type { NativeToWebMessage, WebToNativeMessage } from '../types';
import { DEBUG_CONSOLE_SCRIPT } from '../utils/debug-console';
import { buildBridgeScript } from '../utils/inject-bridge';
import { APP_SHELL_USER_AGENT } from '../utils/shell-user-agent';
import { ConnectionErrorScreen } from './ConnectionErrorScreen';
import { SetupScreen } from './SetupScreen';

const webUrl = process.env.EXPO_PUBLIC_WEB_URL;

export function WebViewHost() {
  const webViewRef = useRef<WebView>(null);
  const auth = useAuthStore();
  const miniCallBarVisible = useIsMiniCallBarVisible();
  // injectJavaScript silently drops calls made before the page has actually finished
  // loading (no JS context to run in yet) — this counts WebView loads (initial + any
  // reload) so the effect below only fires once there's a page to inject into, and
  // re-fires on every reload since the injected globals don't survive one.
  const [loadCount, setLoadCount] = useState(0);
  const [messageSoundRequest, setMessageSoundRequest] = useState(0);

  // Pushes the current token into web/ whenever it changes (sign-in, refresh).
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

  // Relays the system keyboard's own show/hide timing into web/, so the composer's
  // picker panel can open at that exact height and swap with the real keyboard without
  // a layout jump — see keyboard/show's doc comment in types/index.ts. iOS fires the
  // "will" variants ahead of the animation with a real duration; Android has no such
  // event, only "did" (after the fact) with no reported duration.
  useEffect(() => {
    if (loadCount === 0) return;

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      const message: NativeToWebMessage = {
        type: 'keyboard/show',
        height: event.endCoordinates.height,
        duration: event.duration || 250,
      };
      webViewRef.current?.injectJavaScript(buildBridgeScript(message));
    });
    const hideSubscription = Keyboard.addListener(hideEvent, (event) => {
      const message: NativeToWebMessage = {
        type: 'keyboard/hide',
        duration: event?.duration || 200,
      };
      webViewRef.current?.injectJavaScript(buildBridgeScript(message));
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [loadCount]);

  function handleMessage(event: WebViewMessageEvent) {
    let message: WebToNativeMessage;
    try {
      message = JSON.parse(event.nativeEvent.data) as WebToNativeMessage;
    } catch {
      return;
    }
    if (message.type === 'auth/sign-out') {
      // Unregister first — the access token is still valid at this point; once
      // signOut() clears it, there's nothing left to authorize the DELETE with.
      void unregisterCurrentDevice().finally(() => void useAuthStore.getState().signOut());
    } else if (message.type === 'auth/refresh-request') {
      // Updates the store; the effect above picks up the new token and re-injects it.
      void useAuthStore.getState().refreshNow();
    } else if (message.type === 'calls/connect') {
      void connectBridgedCall(message.payload);
    } else if (message.type === 'haptics/selection') {
      void selectionAsync().catch(() => undefined);
    } else if (message.type === 'notifications/message-sound') {
      if (AppState.currentState !== 'active') return;
      if (__DEV__) console.log('[notifications] native sound requested');
      setMessageSoundRequest((request) => request + 1);
    } else if (__DEV__ && message.type === 'debug/console') {
      console[message.level](`[webview]`, ...message.args);
    } else if (__DEV__ && message.type === 'debug/error') {
      console.error('[webview] uncaught error:', message.message);
    }
  }

  if (!webUrl) {
    return <SetupScreen />;
  }

  return (
    // Keeps the WebView clear of the notch/Dynamic Island and the home indicator — the
    // WebView is a plain native UIView and won't respect safe-area insets on its own the
    // way a native screen or a web page with env(safe-area-inset-*) would. Only the
    // 'top' edge is conditional: NativeMiniCallBar already claims that inset for
    // itself when it's showing above this (see useIsMiniCallBarVisible) — reserving
    // it here too would double it, leaving a gap between the bar and this view.
    <SafeAreaView
      style={styles.container}
      edges={miniCallBarVisible ? ['bottom'] : ['top', 'bottom']}
    >
      <MessageNotificationSound request={messageSoundRequest} />
      <WebView
        ref={webViewRef}
        source={{ uri: webUrl }}
        style={styles.webview}
        applicationNameForUserAgent={APP_SHELL_USER_AGENT}
        onMessage={handleMessage}
        onLoadEnd={() => {
          setLoadCount((count) => count + 1);
          // WKWebView doesn't reliably become first responder on its own —
          // without this, the very first tap anywhere after a (re)load gets
          // consumed establishing focus instead of reaching its target,
          // which reads as "the button needs two taps" (confirmed: only
          // ever happens inside this WebView, never on desktop).
          webViewRef.current?.requestFocus();
        }}
        injectedJavaScriptBeforeContentLoaded={__DEV__ ? DEBUG_CONSOLE_SCRIPT : undefined}
        onError={(event: WebViewErrorEvent) =>
          console.error('[webview] onError', event.nativeEvent)
        }
        onHttpError={(event: WebViewHttpErrorEvent) =>
          console.error('[webview] onHttpError', event.nativeEvent)
        }
        onContentProcessDidTerminate={(event: WebViewTerminatedEvent) =>
          console.error('[webview] render process terminated', event.nativeEvent)
        }
        renderError={() => <ConnectionErrorScreen onRetry={() => webViewRef.current?.reload()} />}
      />
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  webview: { flex: 1 },
});
