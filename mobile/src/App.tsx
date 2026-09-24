import { AuthGate } from './features/auth/components/AuthGate';
import { WebViewHost } from './features/webview';
import { AppProviders } from './shell/AppProviders';

export default function App() {
  return (
    <AppProviders>
      <AuthGate>
        <WebViewHost />
      </AuthGate>
    </AppProviders>
  );
}
