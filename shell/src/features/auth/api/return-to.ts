export function safeReturnTo(state: unknown): string {
  const value =
    state && typeof state === 'object' && 'returnTo' in state ? state.returnTo : undefined;

  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\')
  )
    return '/';

  try {
    const url = new URL(value, 'https://app.local');
    if (
      url.origin !== 'https://app.local' ||
      decodeURIComponent(url.pathname).startsWith('/auth/callback')
    )
      return '/';

    return url.pathname + url.search + url.hash;
  } catch {
    return '/';
  }
}
