import { AuthGate } from './features/auth/components/AuthGate';
import { CallSession, NativeInCallScreen } from './features/calls';
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
      <AuthGate>
        <PushPrimingGate>
          <WebViewHost />
        </PushPrimingGate>
      </AuthGate>
      <ErrorBoundary label="native-in-call-screen">
        <NativeInCallScreen />
      </ErrorBoundary>
    </AppProviders>
  );
}
