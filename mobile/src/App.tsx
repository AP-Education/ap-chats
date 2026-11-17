import { View } from 'react-native';

import { WindowBackground } from './features/appearance';
import { AuthGate } from './features/auth/components/AuthGate';
import {
  CallRuntime,
  NativeInCallScreen,
  NativeIncomingCallScreen,
  NativeMiniCallBar,
} from './features/calls';
import { CallReadinessGate } from './features/calls/components/CallReadinessGate';
import { NotificationResponses } from './features/push/components/NotificationResponses';
import { PushPrimingGate } from './features/push/components/PushPrimingGate';
import { PushRegistration } from './features/push/components/PushRegistration';
import { CompatGate, LaunchReporter, ReloadGuard, UpdateRuntime } from './features/updates';
import { WebViewHost } from './features/webview';
import { AppProviders } from './shell/AppProviders';
import { ErrorBoundary } from './shell/ErrorBoundary';

export default function App() {
  return (
    <AppProviders>
      <WindowBackground />
      <ErrorBoundary label="notification-responses">
        <NotificationResponses />
      </ErrorBoundary>
      <ErrorBoundary label="push-registration">
        <PushRegistration />
      </ErrorBoundary>
      <CallRuntime />
      <ErrorBoundary label="updates">
        <UpdateRuntime />
        <ReloadGuard />
        <LaunchReporter />
      </ErrorBoundary>
      {/* A normal flex column, not a Fragment: NativeMiniCallBar is a regular
          sibling here (not an absolute overlay) so the WebView actually
          shrinks to make room for it instead of it covering the WebView's
          own top edge. */}
      <View style={{ flex: 1 }}>
        <ErrorBoundary label="native-mini-call-bar">
          <NativeMiniCallBar />
        </ErrorBoundary>
        <CompatGate>
          <AuthGate>
            <PushPrimingGate>
              <CallReadinessGate>
                <WebViewHost />
              </CallReadinessGate>
            </PushPrimingGate>
          </AuthGate>
        </CompatGate>
      </View>
      <ErrorBoundary label="native-incoming-call-screen">
        <NativeIncomingCallScreen />
      </ErrorBoundary>
      <ErrorBoundary label="native-in-call-screen">
        <NativeInCallScreen />
      </ErrorBoundary>
    </AppProviders>
  );
}
