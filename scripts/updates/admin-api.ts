import type { ShellPlatform, UpdateChannel } from './manifest';

/** One update as `GET /api/updates/admin/releases` lists it. */
export interface UpdateSummary {
  id: string;
  kind: 'update' | 'rollback_to_embedded';
  platform: ShellPlatform;
  channel: UpdateChannel;
  runtimeVersion: string;
  buildNumber: number;
  rolloutPercent: number;
  status: 'active' | 'paused' | 'revoked';
  mandatory: boolean;
  sourceUpdateId: string | null;
  gitCommit: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  launches: number;
  successes: number;
  emergencyLaunches: number;
}

export interface PublishInput {
  platform: ShellPlatform;
  channel: UpdateChannel;
  runtimeVersion: string;
  manifest: unknown;
  rolloutPercent?: number;
  mandatory?: boolean;
  gitCommit?: string;
  notes?: string;
  createdBy?: string;
}

export class AdminApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** The CI side of `/api/updates/admin`, which only the bearer of the admin token may call. */
export function adminApi(options: { apiUrl: string; token: string; fetch?: typeof fetch }) {
  const base = `${secureOrigin(options.apiUrl)}/api/updates/admin`;
  const send = options.fetch ?? fetch;

  async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await send(`${base}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${options.token}`,
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      // A hung API must not hold the shared queue that an urgent rollback waits in.
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const text = await response.text();
    if (!response.ok) throw new AdminApiError(response.status, errorMessage(response.status, text));
    return (text ? JSON.parse(text) : undefined) as T;
  }

  return {
    registerRuntime: (platform: ShellPlatform, runtimeVersion: string, buildNumber: number) =>
      call<void>('POST', '/runtimes', { platform, runtimeVersion, buildNumber }),
    publish: (input: PublishInput) => call<{ id: string }>('POST', '/releases', input),
    list: (channel: UpdateChannel, platform?: ShellPlatform) =>
      call<UpdateSummary[]>(
        'GET',
        `/releases?${new URLSearchParams({ channel, ...(platform ? { platform } : {}) })}`,
      ),
    setRollout: (id: string, percent: number) =>
      call<void>('PATCH', `/releases/${encodeURIComponent(id)}/rollout`, { percent }),
    pause: (id: string) => call<void>('POST', `/releases/${encodeURIComponent(id)}/pause`),
    rollback: (id: string, embedded: boolean) =>
      call<{ id: string; kind: UpdateSummary['kind']; sourceUpdateId: string | null }>(
        'POST',
        `/releases/${encodeURIComponent(id)}/rollback`,
        { embedded },
      ),
  };
}

const REQUEST_TIMEOUT_MS = 60_000;

/** The admin token travels in a header, so only HTTPS is allowed, or plain HTTP to this machine. */
function secureOrigin(apiUrl: string): string {
  const url = new URL(apiUrl);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local))
    throw new Error(`UPDATES_API_URL must use https: ${url.origin}`);
  return `${url.origin}${url.pathname.replace(/\/+$/u, '')}`;
}

function errorMessage(status: number, text: string): string {
  let detail = text;
  try {
    const body = JSON.parse(text) as { message?: unknown };
    if (body.message !== undefined)
      detail = Array.isArray(body.message) ? body.message.join('; ') : String(body.message);
  } catch {
    // Not JSON: the text is the detail.
  }
  if (status === 401) return 'The API refused the admin token: check UPDATES_ADMIN_TOKEN';
  return `The API answered ${status}: ${detail || 'no details'}`;
}
