import { create, type StoreApi, type UseBoundStore } from 'zustand';

import type { AuthSessionProvider, AuthState, TokenSet, TokenStore } from '../types';

const REFRESH_MARGIN_MS = 60_000;

interface AuthActions {
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  restore: () => Promise<void>;
}

export type AuthStoreState = AuthState & AuthActions;
export type AuthStore = UseBoundStore<StoreApi<AuthStoreState>>;

/**
 * Builds the auth store bound to concrete session/persistence adapters. A factory
 * (not a bare `create(...)` at module scope) so features/auth/index.ts stays the one
 * place that wires ports to adapters — this file never imports expo-auth-session or
 * expo-secure-store directly.
 *
 * The refresh timer lives in this closure (not in store state) so tokens keep renewing
 * even while the WebView is suspended in the background — the WebView only ever
 * receives already-valid tokens through the bridge, it never drives refresh.
 */
export function createAuthStore(
  session: AuthSessionProvider,
  tokenStore: TokenStore,
  configured: boolean,
): AuthStore {
  let refreshTimer: ReturnType<typeof setTimeout> | null = null;

  function clearRefreshTimer(): void {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = null;
  }

  const useAuthStore = create<AuthStoreState>()((set, get) => {
    function scheduleRefresh(tokens: TokenSet): void {
      clearRefreshTimer();
      if (!tokens.refreshToken) return;
      const delay = Math.max(tokens.expiresAt - Date.now() - REFRESH_MARGIN_MS, 0);
      refreshTimer = setTimeout(() => void refresh(tokens), delay);
    }

    async function refresh(tokens: TokenSet): Promise<void> {
      try {
        const refreshed = await session.refresh(tokens);
        await tokenStore.save(refreshed);
        set({ status: 'signed-in', tokens: refreshed });
        scheduleRefresh(refreshed);
      } catch {
        // Refresh token expired/revoked — fall back to an interactive sign-in.
        await tokenStore.clear();
        set({ status: 'signed-out' });
      }
    }

    return {
      status: configured ? 'signed-out' : 'unconfigured',

      async restore() {
        if (get().status === 'unconfigured') return;
        const tokens = await tokenStore.load();
        if (tokens) {
          set({ status: 'signed-in', tokens });
          scheduleRefresh(tokens);
        }
      },

      async signIn() {
        if (get().status === 'unconfigured') return;
        set({ status: 'signing-in' });
        try {
          const tokens = await session.signIn();
          await tokenStore.save(tokens);
          set({ status: 'signed-in', tokens });
          scheduleRefresh(tokens);
        } catch (error) {
          set({ status: 'error', message: toMessage(error) });
        }
      },

      async signOut() {
        clearRefreshTimer();
        await tokenStore.clear();
        await session.signOut();
        set({ status: 'signed-out' });
      },
    };
  });

  return useAuthStore;
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Sign-in failed';
}
