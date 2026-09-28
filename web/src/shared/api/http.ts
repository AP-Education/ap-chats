export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type AuthSession = { identity: string; token: string; refresh: () => Promise<string> };

let authSession: AuthSession | null = null;
let refreshInFlight: { identity: string; token: string; promise: Promise<string> } | null = null;
let lastRefresh: { identity: string; oldToken: string; newToken: string } | null = null;

export function setApiAuthSession(session: AuthSession | null): void {
  authSession = session;
  if (session && lastRefresh && session.identity !== lastRefresh.identity) {
    lastRefresh = null;
  }
}

async function recoverToken(failedToken: string): Promise<string | null> {
  const session = authSession;
  if (!session) return null;
  if (session.token !== failedToken) return session.token;
  if (lastRefresh?.identity === session.identity && lastRefresh.oldToken === failedToken) {
    return lastRefresh.newToken;
  }

  if (refreshInFlight?.identity !== session.identity || refreshInFlight.token !== failedToken) {
    const pending = session.refresh();
    const inFlight = { identity: session.identity, token: failedToken, promise: pending };
    refreshInFlight = inFlight;
    void pending
      .then(
        (token) => {
          if (authSession?.identity === session.identity) {
            lastRefresh = { identity: session.identity, oldToken: failedToken, newToken: token };
          }
        },
        () => undefined,
      )
      .finally(() => {
        if (refreshInFlight === inFlight) refreshInFlight = null;
      });
  }
  return refreshInFlight.promise;
}

// Shared authenticated fetch used by every feature's api/ layer. Keeps the
// Bearer header and status handling in one place instead of each feature
// reimplementing it.
export async function apiRequest<T>(url: string, token: string, init?: RequestInit): Promise<T> {
  const send = (accessToken: string) =>
    fetch(url, {
      ...init,
      headers: { ...init?.headers, Authorization: `Bearer ${accessToken}` },
    });
  let response = await send(token);
  if (response.status === 401) {
    const freshToken = await recoverToken(token);
    if (freshToken && freshToken !== token) response = await send(freshToken);
  }
  if (!response.ok)
    throw new ApiError(`Request to ${url} failed: ${response.status}`, response.status);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function jsonInit(method: string, body: unknown): RequestInit {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}
