import type { AuthStoreState } from '../../auth/stores/auth-store';
import type { NativeToWebMessage } from '../types';

/** What web/ hears of the session: its token, or that none is ever coming. */
export function tokenMessage(auth: AuthStoreState): NativeToWebMessage | null {
  if (auth.status === 'signed-in') {
    const { accessToken, expiresAt, idToken } = auth.tokens;
    return { type: 'auth/token', payload: { accessToken, expiresAt, idToken } };
  }
  // AuthGate shows the page only signed in or unconfigured, and unconfigured never gets a token.
  if (auth.status === 'unconfigured') return { type: 'auth/unavailable' };
  return null;
}
