import { selectionAsync } from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Portal } from 'react-native-teleport';
import WebView, { type WebViewMessageEvent } from 'react-native-webview';
import type {
  WebViewErrorEvent,
  WebViewHttpErrorEvent,
  WebViewTerminatedEvent,
} from 'react-native-webview/lib/WebViewTypes';

import { useAppearanceStore, useShellPalette } from '../../appearance';
import { useAuthStore } from '../../auth/index';
import { connectBridgedCall, useIsMiniCallBarVisible } from '../../calls';
import {
  type ComposerInputState,
  EmojiKeyboardPanel,
  type GifResult,
  type InsetMotion,
  isComposerInputRequest,
  useComposerInput,
} from '../../composer';
import { NativeTabs } from '../../navigation/components/NativeTabs';
import type { TabBarModel } from '../../navigation/types';
import { changePushPermission } from '../../push/api/change-push-permission';
import { dismissPresentedNotifications } from '../../push/api/presented-notifications';
import { getPushPermissionStatus } from '../../push/api/push-token';
import { MessageNotificationSound } from '../../push/components/MessageNotificationSound';
import { useNotificationStore } from '../../push/store/notification-store';
import { forgetLastLocation, loadLastLocation, rememberLocation } from '../api/last-location';
import type { NativeToWebMessage, WebToNativeMessage } from '../types';
import { DEBUG_CONSOLE_SCRIPT } from '../utils/debug-console';
import { buildBridgeScript } from '../utils/inject-bridge';
import { insetBottomScript, pageBottom, pageKeyboardInset } from '../utils/page-inset';
import { APP_SHELL_USER_AGENT } from '../utils/shell-user-agent';
import { ConnectionErrorScreen } from './ConnectionErrorScreen';
import { SetupScreen } from './SetupScreen';

const webUrl = process.env.EXPO_PUBLIC_WEB_URL;
// Lets Safari's Web Inspector profile a test build's page; store builds leave it closed.
const inspectable = __DEV__ || process.env.EXPO_PUBLIC_WEBVIEW_INSPECTABLE === 'true';

export function WebViewHost() {
  // 13.17 defaults WebView's extra props to `undefined`, which leaves it accepting none.
  const webViewRef = useRef<WebView<object>>(null);
  const auth = useAuthStore();
  const pendingNotification = useNotificationStore((state) => state.pending);
  const webReady = useNotificationStore((state) => state.webReady);
  const miniCallBarVisible = useIsMiniCallBarVisible();
  const palette = useShellPalette();
  // The status bar sits on the page's own surface, or on the dark call strip above it.
  const statusBarOnDark = palette.appearance === 'dark' || miniCallBarVisible;
  // injectJavaScript silently drops calls made before the page has actually finished
  // loading (no JS context to run in yet) — this counts WebView loads (initial + any
  // reload) so the effect below only fires once there's a page to inject into, and
  // re-fires on every reload since the injected globals don't survive one.
  const [loadCount, setLoadCount] = useState(0);
  const [messageSoundRequest, setMessageSoundRequest] = useState(0);
  const [tabBar, setTabBar] = useState<TabBarModel | null>(null);
  const insets = useSafeAreaInsets();
  // WKWebView reports the safe areas to the page (viewport-fit=cover), so the page draws its own
  // surfaces under the status bar and home indicator. Android's WebView does not, so native
  // keeps the page clear of the system bars there.
  const edgeToEdge = Platform.OS === 'ios';
  const [containerHeight, setContainerHeight] = useState(0);
  const sendInputState = useCallback((state: ComposerInputState) => {
    webViewRef.current?.injectJavaScript(buildBridgeScript({ type: 'composer/state', ...state }));
  }, []);
  // Measured rather than assumed: where the page ends depends on the tab it is teleported into.
  const containerRef = useRef<View>(null);
  const pageRef = useRef<View>(null);
  const [pageGap, setPageGap] = useState(0);
  // The page's own safe area can't tell its bottom inside a tab: it grows under the tab bar and
  // empties under the keyboard. Native knows, and writes it into the page's CSS.
  const insetBottom = insetBottomScript(pageBottom(pageGap, insets.bottom, edgeToEdge).safeArea);
  const room = useRef(0);
  const sendInset = useCallback(
    ({ duration, easing }: InsetMotion) => {
      const inset = pageKeyboardInset(room.current, pageBottom(pageGap, insets.bottom, edgeToEdge));
      webViewRef.current?.injectJavaScript(
        buildBridgeScript({ type: 'keyboard/inset', inset, duration, easing }),
      );
    },
    [edgeToEdge, insets.bottom, pageGap],
  );
  const handleRoom = useCallback(
    (next: number, motion: InsetMotion) => {
      room.current = next;
      sendInset(motion);
    },
    [sendInset],
  );
  const measurePage = useCallback(() => {
    containerRef.current?.measureInWindow((_x, containerTop, _width, outerHeight) => {
      pageRef.current?.measureInWindow((_pageX, pageTop, _pageWidth, pageHeight) => {
        const containerBottom = containerTop + outerHeight;
        setPageGap(Math.max(0, Math.round(containerBottom - pageTop - pageHeight)));
      });
    });
  }, []);
  const reservedInset = edgeToEdge ? 0 : insets.bottom;
  const input = useComposerInput(sendInputState, handleRoom, { reservedInset, containerHeight });
  // Opens on the page the person left; unset until the stored one is read, a moment at launch.
  const [startUrl, setStartUrl] = useState<string>();

  useEffect(() => {
    if (webUrl) void loadLastLocation(webUrl).then((url) => setStartUrl(url ?? webUrl));
  }, []);

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

  // Routed only once the page says it can; it acknowledges, and the tap stays pending until then.
  useEffect(() => {
    if (auth.status !== 'signed-in' || !webReady || !pendingNotification || loadCount === 0) return;

    webViewRef.current?.injectJavaScript(
      buildBridgeScript({ type: 'notifications/open', payload: pendingNotification }),
    );
  }, [auth.status, webReady, pendingNotification, loadCount]);

  useEffect(() => () => useNotificationStore.getState().setWebReady(false), []);

  // A reloaded page, or one that now ends elsewhere, takes its geometry at once.
  useEffect(() => {
    if (loadCount === 0) return;

    webViewRef.current?.injectJavaScript(insetBottom);
    sendInset(INSTANT);
  }, [insetBottom, loadCount, sendInset]);

  // Settings changes the permission outside the app, so it is re-read on every return.
  useEffect(() => {
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') sendPushPermission();
    });
    return () => appState.remove();
  }, []);

  function sendPushPermission() {
    void getPushPermissionStatus().then((status) =>
      webViewRef.current?.injectJavaScript(
        buildBridgeScript({ type: 'notifications/permission', status }),
      ),
    );
  }

  function handleMessage(event: WebViewMessageEvent) {
    let message: WebToNativeMessage;
    try {
      message = JSON.parse(event.nativeEvent.data) as WebToNativeMessage;
    } catch {
      return;
    }
    if (isComposerInputRequest(message)) {
      input.request(message);
    } else if (message.type === 'notifications/ready') {
      useNotificationStore.getState().setWebReady(true);
    } else if (message.type === 'notifications/ack') {
      const routed = useNotificationStore.getState().pending?.eventId === message.eventId;
      useNotificationStore.getState().acknowledge(message.eventId);
      if (routed) void Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
    } else if (message.type === 'notifications/dismiss') {
      void dismissPresentedNotifications(message.collapseKey);
    } else if (message.type === 'notifications/context') {
      useNotificationStore.getState().setWebAttending(message.payload.attending);
    } else if (message.type === 'notifications/permission-check') {
      sendPushPermission();
    } else if (message.type === 'notifications/settings') {
      void changePushPermission().then(sendPushPermission);
    } else if (message.type === 'auth/sign-out') {
      // PushRegistration unregisters the device on any way out of the session.
      forgetLastLocation();
      void useAuthStore.getState().signOut();
    } else if (message.type === 'auth/refresh-request') {
      // Updates the store; the effect above picks up the new token and re-injects it.
      void useAuthStore.getState().refreshNow();
    } else if (message.type === 'calls/connect') {
      void connectBridgedCall(message.payload);
    } else if (message.type === 'appearance/changed') {
      useAppearanceStore.getState().setPalette(message.payload);
    } else if (message.type === 'navigation/tabs') {
      setTabBar(message.payload);
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

  // The page moves into the chosen tab at once; the page then confirms it in its next model.
  function handleSelectTab(id: string) {
    setTabBar((current) => current && { ...current, activeId: id });
    webViewRef.current?.injectJavaScript(buildBridgeScript({ type: 'navigation/select', id }));
  }

  const handleTabBarInset = useCallback((bottom: number) => {
    webViewRef.current?.injectJavaScript(buildBridgeScript({ type: 'navigation/inset', bottom }));
  }, []);

  function handlePickEmoji(text: string) {
    const { sessionId, requestId, mode } = input.state;
    if (!sessionId || (mode !== 'picker' && mode !== 'search')) return;
    const message: NativeToWebMessage = { type: 'composer/insert', sessionId, requestId, text };
    webViewRef.current?.injectJavaScript(buildBridgeScript(message));
  }

  function handlePickGif(gif: GifResult) {
    const { sessionId, requestId, mode } = input.state;
    if (!sessionId || (mode !== 'picker' && mode !== 'search')) return;
    const message: NativeToWebMessage = {
      type: 'composer/gif',
      sessionId,
      requestId,
      url: gif.url,
      title: gif.title,
    };
    webViewRef.current?.injectJavaScript(buildBridgeScript(message));
  }

  if (!webUrl) {
    return <SetupScreen />;
  }

  return (
    // NativeMiniCallBar claims the top inset itself while it shows above this view.
    <SafeAreaView
      ref={containerRef}
      style={[styles.container, { backgroundColor: palette.surface }]}
      edges={edgeToEdge || miniCallBarVisible ? [] : ['top']}
      onLayout={(event) => {
        setContainerHeight(event.nativeEvent.layout.height);
        measurePage();
      }}
    >
      <MessageNotificationSound request={messageSoundRequest} />
      <View style={[styles.webviewWrapper, { paddingBottom: reservedInset }]}>
        {startUrl && (
          <Portal hostName={tabBar?.activeId} style={styles.page}>
            <View ref={pageRef} style={styles.page} onLayout={measurePage} collapsable={false}>
              <WebView<object>
                ref={webViewRef}
                source={{ uri: startUrl }}
                style={[styles.webview, { backgroundColor: palette.surface }]}
                // The page keeps its size under the keyboard and pads itself by `keyboard/inset`;
                // WKWebView would otherwise shift and resize it a beat behind the keyboard.
                removeIosKeyboardObserver
                hideKeyboardAccessoryView
                // An app screen, not a document: no pinch zoom (Android; iOS follows the page viewport).
                setBuiltInZoomControls={false}
                webviewDebuggingEnabled={inspectable}
                keyboardDisplayRequiresUserAction={false}
                automaticallyAdjustContentInsets={false}
                contentInsetAdjustmentBehavior="never"
                scrollEnabled={false}
                bounces={false}
                onLoadStart={() => {
                  input.close();
                  // Hidden rather than dropped: the page lives inside a tab's host until it reloads.
                  setTabBar((current) => current && { ...current, visible: false });
                  useNotificationStore.getState().setWebReady(false);
                }}
                applicationNameForUserAgent={APP_SHELL_USER_AGENT}
                onNavigationStateChange={(event) => rememberLocation(event.url, webUrl)}
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
                injectedJavaScriptBeforeContentLoaded={
                  __DEV__ ? DEBUG_CONSOLE_SCRIPT + insetBottom : insetBottom
                }
                onError={(event: WebViewErrorEvent) =>
                  console.error('[webview] onError', event.nativeEvent)
                }
                onHttpError={(event: WebViewHttpErrorEvent) =>
                  console.error('[webview] onHttpError', event.nativeEvent)
                }
                onContentProcessDidTerminate={(event: WebViewTerminatedEvent) =>
                  console.error('[webview] render process terminated', event.nativeEvent)
                }
                renderError={() => (
                  <ConnectionErrorScreen onRetry={() => webViewRef.current?.reload()} />
                )}
              />
            </View>
          </Portal>
        )}
        {tabBar && (
          <NativeTabs model={tabBar} onSelect={handleSelectTab} onInset={handleTabBarInset} />
        )}
      </View>
      <EmojiKeyboardPanel
        mode={input.mode}
        keyboardHeight={input.keyboardHeight}
        panelHeight={input.panelHeight}
        heldHeight={input.heldHeight}
        bottomInset={insets.bottom}
        reservedInset={reservedInset}
        containerHeight={containerHeight}
        visible={input.state.mode === 'picker' || input.state.mode === 'search'}
        activeTab={input.state.tab}
        onTabChange={input.selectTab}
        onSearchFocus={input.search}
        onPickEmoji={handlePickEmoji}
        onPickGif={handlePickGif}
      />
      <StatusBar style={statusBarOnDark ? 'light' : 'dark'} />
    </SafeAreaView>
  );
}

const INSTANT: InsetMotion = { duration: 0, easing: 'linear' };

const styles = StyleSheet.create({
  container: { flex: 1 },
  webviewWrapper: { flex: 1 },
  page: { flex: 1 },
  webview: { flex: 1 },
});
