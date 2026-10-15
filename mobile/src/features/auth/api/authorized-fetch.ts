import { fetchWithTimeout } from '../../../shared/api/fetch-with-timeout';
import type { AuthStore } from '../stores/auth-store';

export type AuthorizedFetch = (url: string, init?: RequestInit) => Promise<Response>;

export class RequestAbortedError extends Error {
  constructor() {
    super('Request aborted');
  }
}

/**
 * A request carrying the session's token. It is sent at most twice: once, and once more only
 * after a 401 for the token it carried, if the auth store could renew that token. Any other
 * answer, a 403 included, and a second 401 come back to the caller as they are.
 */
export function createAuthorizedFetch(auth: AuthStore): AuthorizedFetch {
  return async (url, init = {}) => {
    const token = await auth.getState().freshAccessToken();
    // Whoever gave up while the token was on its way must not still reach the server.
    if (init.signal?.aborted) throw new RequestAbortedError();

    const response = await fetchWithTimeout(url, withBearer(init, token));
    if (response.status !== 401) return response;

    const renewed = await auth.getState().renewAccessToken(token);
    if (!renewed) return response;

    return fetchWithTimeout(url, withBearer(init, renewed));
  };
}

function withBearer(init: RequestInit, token: string): RequestInit {
  return { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } };
}
