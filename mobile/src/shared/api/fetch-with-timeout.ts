export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = 10000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  // The caller giving up cancels the request too, not only the timeout.
  const cancel = () => controller.abort();
  init.signal?.addEventListener('abort', cancel);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    init.signal?.removeEventListener('abort', cancel);
  }
}
