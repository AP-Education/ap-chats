import { create, type StoreApi, type UseBoundStore } from 'zustand';

import {
  type AuthSessionProvider,
  type AuthState,
  NotSignedInError,
  SessionExpiredError,
  type TokenSet,
  type TokenStore,
} from '../types';

// Long enough for a request to reach the server before the token it carries expires.
const EXPIRY_SKEW_MS = 30_000;

function isExpired(tokens: TokenSet): boolean {
  return tokens.expiresAt - Date.now() <= EXPIRY_SKEW_MS;
}

interface AuthActions {
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  restore: () => Promise<void>;
  /** The access token to send now: renewed first only if it has expired. */
  freshAccessToken: () => Promise<string>;
  /**
   * After the server turned `rejected` (by default the current token) down: the token to retry
   * with, or null when renewing could not help and the rejection stands.
   */
  renewAccessToken: (rejected?: string) => Promise<string | null>;
}

export type AuthStoreState = AuthState & AuthActions;
export type AuthStore = UseBoundStore<StoreApi<AuthStoreState>>;

/**
 * Builds the auth store bound to concrete session/persistence adapters. A factory
 * (not a bare `create(...)` at module scope) so features/auth/index.ts stays the one
 * place that wires ports to adapters — this file never imports expo-auth-session or
 * expo-secure-store directly.
 *
 * Renewal is the only thing that replaces the access token after sign-in, and it happens in two
 * cases only, nothing on a schedule:
 * - expired: the token's own expiry has passed when it is asked for;
 * - rejected: the server turned the current token down. Once per token: a token that came out of
 *   such a renewal and is turned down as well stays as it is, so a server refusing every token
 *   can't drive a renewal loop.
 * A token already replaced when its rejection arrives is never renewed again; the newer one is
 * retried instead.
 */
export function createAuthStore(
  session: AuthSessionProvider,
  tokenStore: TokenStore,
  configured: boolean,
): AuthStore {
  let generation = 0;
  let persistence = Promise.resolve();
  let restoring: Promise<void> = Promise.resolve();
  // Accounts rotates refresh tokens and revokes the whole grant when a used one comes back,
  // so two renewals must never run at once.
  let renewal: { generation: number; promise: Promise<TokenSet> } | null = null;
  let renewedAfterRejection: string | null = null;
  let logoutInFlight: Promise<void> | null = null;
  let logoutIdToken: string | undefined;

  // SecureStore operations must finish in order: a save already in progress when
  // logout begins must complete before the final clear, never after it.
  function persist(operation: () => Promise<void>): Promise<void> {
    const next = persistence.then(operation);
    persistence = next.catch(() => {});
    return next;
  }

  const useAuthStore = create<AuthStoreState>()((set, get) => {
    function transition(state: AuthState): void {
      const { signIn, signOut, restore, freshAccessToken, renewAccessToken } = get();
      // Replace the state so signed-out/error states cannot retain merged tokens.
      set({ ...state, signIn, signOut, restore, freshAccessToken, renewAccessToken }, true);
    }

    async function saveSession(tokens: TokenSet, version: number): Promise<void> {
      await persist(async () => {
        if (version === generation) await tokenStore.save(tokens);
      });
      if (version === generation) transition({ status: 'signed-in', tokens });
    }

    async function endSession(version: number): Promise<void> {
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

    function renew(tokens: TokenSet): Promise<TokenSet> {
      const version = generation;
      if (renewal?.generation === version) return renewal.promise;

      const promise = (async () => {
        try {
          const renewed = await session.refresh(tokens);
          if (version !== generation) throw new NotSignedInError();
          await saveSession(renewed, version);
          return renewed;
        } catch (error) {
          if (version !== generation) throw new NotSignedInError();
          // Only a refused grant ends the session; a dropped connection leaves it for the next use.
          if (!(error instanceof SessionExpiredError)) throw error;
          await endSession(version);
          throw new NotSignedInError();
        }
      })();

      const settle = () => {
        if (renewal?.promise === promise) renewal = null;
      };
      promise.then(settle, settle);
      renewal = { generation: version, promise };
      return promise;
    }

    async function currentTokens(): Promise<TokenSet> {
      await restoring;
      const state = get();
      if (state.status !== 'signed-in') throw new NotSignedInError();
      return state.tokens;
    }

    return {
      status: configured ? 'signed-out' : 'unconfigured',

      restore() {
        if (get().status !== 'signed-out') return restoring;
        const version = generation;
        restoring = (async () => {
          try {
            const tokens = await tokenStore.load();
            if (tokens && version === generation) transition({ status: 'signed-in', tokens });
          } catch (error) {
            if (version === generation) {
              transition({ status: 'error', operation: 'sign-in', message: toMessage(error) });
            }
          }
        })();
        return restoring;
      },

      async signIn() {
        const status = get().status;
        if (status !== 'signed-out' && status !== 'error') return;
        const version = ++generation;
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

      async freshAccessToken() {
        const tokens = await currentTokens();
        if (!isExpired(tokens)) return tokens.accessToken;
        return (await renew(tokens)).accessToken;
      },

      async renewAccessToken(rejected) {
        const tokens = await currentTokens();
        const current = tokens.accessToken;
        if (rejected && rejected !== current) return current;
        if (isExpired(tokens)) return (await renew(tokens)).accessToken;
        if (current === renewedAfterRejection) return null;

        const renewed = await renew(tokens);
        renewedAfterRejection = renewed.accessToken;
        return renewed.accessToken;
      },
    };
  });

  return useAuthStore;
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Authentication failed';
}
