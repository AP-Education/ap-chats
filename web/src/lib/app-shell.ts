// Mirrors mobile/src/features/webview/utils/shellUserAgent.ts.
const SHELL_USER_AGENT_TOKENS = { mobile: 'ApConnectMobile/' } as const;

export type AppShell =
  { kind: 'browser' } | { kind: 'mobile'; platform: 'ios' | 'android' | 'unknown' };

function detectAppShell(): AppShell {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  if (!ua.includes(SHELL_USER_AGENT_TOKENS.mobile)) return { kind: 'browser' };

  const platform = /iphone|ipad|ipod/i.test(ua)
    ? 'ios'
    : /android/i.test(ua)
      ? 'android'
      : 'unknown';
  return { kind: 'mobile', platform };
}

let cachedShell: AppShell | undefined;

export function getAppShell(): AppShell {
  return (cachedShell ??= detectAppShell());
}
