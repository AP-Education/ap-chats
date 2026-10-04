import { create, type StoreApi, type UseBoundStore } from 'zustand';

import type { AuthSessionProvider, AuthState, TokenSet, TokenStore } from '../types';

const REFRESH_MARGIN_MS = 60_000;

interface AuthActions {
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  restore: () => Promise<void>;
  refreshNow: () => Promise<void>;
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
  let generation = 0;
  let persistence = Promise.resolve();
  let refreshInFlight: { generation: number; promise: Promise<void> } | null = null;
  let logoutInFlight: Promise<void> | null = null;
  let logoutIdToken: string | undefined;

  // SecureStore operations must finish in order: a save already in progress when
  // logout begins must complete before the final clear, never after it.
  function persist(operation: () => Promise<void>): Promise<void> {
    const next = persistence.then(operation);
    persistence = next.catch(() => {});
    return next;
  }

  function clearRefreshTimer(): void {
    if (refreshTimer !== null) clearTimeout(refreshTimer);
    refreshTimer = null;
  }

  const useAuthStore = create<AuthStoreState>()((set, get) => {
    function transition(state: AuthState): void {
      const { signIn, signOut, restore, refreshNow } = get();
      // Replace the state so signed-out/error states cannot retain merged tokens.
      set({ ...state, signIn, signOut, restore, refreshNow }, true);
    }

    async function saveSession(tokens: TokenSet, version: number): Promise<void> {
      await persist(async () => {
        if (version === generation) await tokenStore.save(tokens);
      });
      if (version !== generation) return;
      transition({ status: 'signed-in', tokens });
      scheduleRefresh(tokens);
    }

    function scheduleRefresh(tokens: TokenSet): void {
      clearRefreshTimer();
      if (!tokens.refreshToken) return;
      const delay = Math.max(tokens.expiresAt - Date.now() - REFRESH_MARGIN_MS, 0);
      refreshTimer = setTimeout(() => void refresh(tokens), delay);
    }

    function refresh(tokens: TokenSet): Promise<void> {
      const version = generation;
      if (refreshInFlight?.generation === version) return refreshInFlight.promise;
      const promise = (async () => {
        try {
          const refreshed = await session.refresh(tokens);
          if (version !== generation) return;
          await saveSession(refreshed, version);
        } catch {
          if (version !== generation) return;
          clearRefreshTimer();
          try {
            await persist(async () => {
              if (version === generation) await tokenStore.clear();
            });
            if (version === generation) transition({ status: 'signed-out' });
          } catch (error) {
            if (version === generation) {
              transition({ status: 'error', operation: 'sign-in', message: toMessage(error) });
            }
          }
        }
      })();
      refreshInFlight = { generation: version, promise };
      void promise.finally(() => {
        if (refreshInFlight?.promise === promise) refreshInFlight = null;
      });
      return promise;
    }

    return {
      status: configured ? 'signed-out' : 'unconfigured',

      async restore() {
        if (get().status !== 'signed-out') return;
        const version = generation;
        try {
          const tokens = await tokenStore.load();
          if (tokens && version === generation) {
            transition({ status: 'signed-in', tokens });
            scheduleRefresh(tokens);
          }
        } catch (error) {
          if (version === generation) {
            transition({ status: 'error', operation: 'sign-in', message: toMessage(error) });
          }
        }
      },

      async signIn() {
        const status = get().status;
        if (status !== 'signed-out' && status !== 'error') return;
        const version = ++generation;
        clearRefreshTimer();
        transition({ status: 'signing-in' });
        try {
          const tokens = await session.signIn();
          if (version !== generation) return;
          logoutIdToken = undefined;
          await saveSession(tokens, version);
        } catch (error) {
          if (version === generation) {
            transition({ status: 'error', operation: 'sign-in', message: toMessage(error) });
          }
        }
      },

      async signOut() {
        if (get().status === 'unconfigured') return;
        if (logoutInFlight) return logoutInFlight;
        const state = get();
        if (state.status === 'signed-in') logoutIdToken = state.tokens.idToken;
        ++generation;
        clearRefreshTimer();
        transition({ status: 'signing-out' });
        logoutInFlight = (async () => {
          try {
            await persist(() => tokenStore.clear());
            await session.signOut(logoutIdToken);
            logoutIdToken = undefined;
            transition({ status: 'signed-out' });
          } catch (error) {
            // Local credentials are cleared even if the system browser is closed
            // early. Keep the ID-token hint privately so Accounts logout can retry.
            transition({ status: 'error', operation: 'sign-out', message: toMessage(error) });
          }
        })();
        await logoutInFlight;
        logoutInFlight = null;
      },

      // Triggered by web/ over the bridge on a 401 — doesn't wait for the schedule,
      // which can't fire while the app was backgrounded past the token's TTL.
      async refreshNow() {
        const state = get();
        if (state.status === 'signed-in') await refresh(state.tokens);
      },
    };
  });

  return useAuthStore;
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Authentication failed';
}
