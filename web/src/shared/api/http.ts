export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Shared authenticated fetch used by every feature's api/ layer. Keeps the
// Bearer header and status handling in one place instead of each feature
// reimplementing it.
export async function apiRequest<T>(url: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${token}` },
  });
  if (!response.ok)
    throw new ApiError(`Request to ${url} failed: ${response.status}`, response.status);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function jsonInit(method: string, body: unknown): RequestInit {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}
