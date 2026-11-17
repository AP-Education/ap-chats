/**
 * The version of a capability the native shell announces in its User-Agent as
 * `ApApp<Name>/<n>` (mobile/src/features/webview/utils/shell-user-agent.ts), or 0 when it has
 * none. A page checks this rather than assume a shell has a feature: shells from the stores
 * stay old for months.
 */
export function shellCapability(name: string, userAgent = globalThis.navigator?.userAgent ?? '') {
  const match = new RegExp(`(?:^|\\s)ApApp${name}/(\\d+)(?:\\s|$)`).exec(userAgent);
  return match ? Number(match[1]) : 0;
}
