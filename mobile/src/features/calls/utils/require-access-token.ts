import { authRestored, useAuthStore } from '../../auth';

/** The native call handlers call the calls API directly, not through the
 * WebView, so they need the current token themselves. */
export async function requireAccessToken(): Promise<string> {
  await authRestored;
  const initial = useAuthStore.getState();
  if (initial.status === 'signed-in' && initial.tokens.expiresAt <= Date.now() + 30000)
    await initial.refreshNow();
  const state = useAuthStore.getState();
  if (state.status !== 'signed-in') throw new Error('Not signed in');
  return state.tokens.accessToken;
}
