import { View } from 'react-native';

import { AuthGate } from './features/auth/components/AuthGate';
import {
  CallSession,
  CallSignalSocket,
  NativeInCallScreen,
  NativeIncomingCallScreen,
  NativeMiniCallBar,
} from './features/calls';
import { PushPrimingGate } from './features/push/components/PushPrimingGate';
import { PushRegistration } from './features/push/components/PushRegistration';
import { WebViewHost } from './features/webview';
import { AppProviders } from './shell/AppProviders';
import { ErrorBoundary } from './shell/ErrorBoundary';

export default function App() {
  return (
    <AppProviders>
      <ErrorBoundary label="push-registration">
        <PushRegistration />
      </ErrorBoundary>
      <ErrorBoundary label="call-session">
        <CallSession />
      </ErrorBoundary>
      <ErrorBoundary label="call-signal-socket">
        <CallSignalSocket />
      </ErrorBoundary>
      {/* A normal flex column, not a Fragment: NativeMiniCallBar is a regular
          sibling here (not an absolute overlay) so the WebView actually
          shrinks to make room for it instead of it covering the WebView's
          own top edge. */}
      <View style={{ flex: 1 }}>
        <ErrorBoundary label="native-mini-call-bar">
          <NativeMiniCallBar />
        </ErrorBoundary>
        <AuthGate>
          <PushPrimingGate>
            <WebViewHost />
          </PushPrimingGate>
        </AuthGate>
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
