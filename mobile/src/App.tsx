import { AuthGate } from './features/auth/components/AuthGate';
import { PushPrimingGate } from './features/push/components/PushPrimingGate';
import { usePushRegistration } from './features/push/hooks/usePushRegistration';
import { WebViewHost } from './features/webview';
import { AppProviders } from './shell/AppProviders';

export default function App() {
  usePushRegistration();

  return (
    <AppProviders>
      <AuthGate>
        <PushPrimingGate>
          <WebViewHost />
        </PushPrimingGate>
      </AuthGate>
    </AppProviders>
  );
}
