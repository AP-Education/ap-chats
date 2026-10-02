import { useAuthStore } from '../../auth';

/** The native call handlers call the calls API directly, not through the
 * WebView, so they need the current token themselves. */
export function requireAccessToken(): string {
  const state = useAuthStore.getState();
  if (state.status !== 'signed-in') throw new Error('Not signed in');
  return state.tokens.accessToken;
}
