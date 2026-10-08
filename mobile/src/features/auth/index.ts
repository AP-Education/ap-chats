import { loadOidcConfig } from './api/config';
import { NativeAuthSession } from './api/native-auth-session';
import { SecureTokenStore } from './api/secure-token-store';
import { UnconfiguredAuthSession } from './api/unconfigured-auth-session';
import { createAuthStore } from './stores/auth-store';

const oidcConfig = loadOidcConfig();

// Module-level singleton: push/call subsystems will need the same auth state later
// (fetching a LiveKit token for an incoming call happens natively, not through the WebView).
export const useAuthStore = createAuthStore(
  oidcConfig ? new NativeAuthSession(oidcConfig) : new UnconfiguredAuthSession(),
  new SecureTokenStore(),
  oidcConfig !== null,
);

// App-lifecycle concern, not component-lifecycle — runs once when this module first
// loads, rather than from a component's useEffect (which would need to guard against
// firing again on every remount/Strict Mode double-invoke).
export const authRestored = useAuthStore.getState().restore();

export type { AuthState, TokenSet } from './types';
