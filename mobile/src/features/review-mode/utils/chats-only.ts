import type { TabBarModel } from '../../navigation/types';

// Mirrors the shell's deployment (ap-app VITE_APPS): Chats lives under /c, the profile at /profile.
// Everything else — AI Native at the root, LMS, CRM, the AI account page — stays out of reach.
const CHATS_BASE_PATH = '/c';
const PROFILE_PATH = '/profile';
const CHATS_TAB_PREFIX = 'chats:';
const PROFILE_TAB_ID = 'profile';

/**
 * Accounts limited to Chats: the store reviewers' (Apple, Google), listed by their Accounts `sub`
 * as a comma-separated EXPO_PUBLIC_REVIEW_ACCOUNT_IDS. A display restriction of this app only.
 */
export function parseAccountIds(raw: string | undefined): ReadonlySet<string> {
  return new Set(
    (raw ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
  );
}

/** The `sub` of an access token, read for display only; the server verifies the token itself. */
export function tokenSubject(accessToken: string): string | null {
  const payload = accessToken.split('.')[1];
  if (!payload) return null;
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const claims: unknown = JSON.parse(atob(padded));
    const sub = claims && typeof claims === 'object' && 'sub' in claims ? claims.sub : null;
    return typeof sub === 'string' && sub ? sub : null;
  } catch {
    return null;
  }
}

export function isChatsOnlyAccount(
  accessToken: string | undefined,
  accountIds: ReadonlySet<string>,
): boolean {
  if (!accessToken || accountIds.size === 0) return false;
  const sub = tokenSubject(accessToken);
  return sub !== null && accountIds.has(sub);
}

/** Whether a page of the shell at `url` is one a Chats-only account may see. */
export function isChatsPage(url: string, appUrl: string): boolean {
  let page: URL;
  try {
    page = new URL(url);
    if (page.origin !== new URL(appUrl).origin) return true;
  } catch {
    return true;
  }
  const { pathname } = page;
  return (
    pathname === CHATS_BASE_PATH ||
    pathname.startsWith(`${CHATS_BASE_PATH}/`) ||
    pathname === PROFILE_PATH
  );
}

export function chatsHomeUrl(appUrl: string): string {
  return new URL(CHATS_BASE_PATH, appUrl).toString();
}

// The profile page's account block: whatever the shell renders between the page header and the
// appearance section. Its Accounts profile endpoint answers 404, so it shows only an error.
const ACCOUNT_BLOCK_SELECTOR =
  ':has(> header + * + section[aria-labelledby="profile-appearance"]) > header + *';
const ACCOUNT_BLOCK_STYLE_ID = 'ap-review-hide-account-block';

/** A script that hides the profile's account block for the rest of the document's life. */
export function hideAccountBlockScript(): string {
  const id = JSON.stringify(ACCOUNT_BLOCK_STYLE_ID);
  const css = JSON.stringify(`${ACCOUNT_BLOCK_SELECTOR}{display:none!important}`);
  return (
    `(function(){if(document.getElementById(${id}))return;` +
    `var s=document.createElement('style');s.id=${id};s.textContent=${css};` +
    `(document.head||document.documentElement).appendChild(s);})();true;`
  );
}

/** The shell's tab bar down to Chats' own tabs and the profile (sign-out, account deletion). */
export function chatsOnlyTabs(model: TabBarModel): TabBarModel {
  const items = model.items.filter(
    ({ id }) => id.startsWith(CHATS_TAB_PREFIX) || id === PROFILE_TAB_ID,
  );
  const activeKept = items.some(({ id }) => id === model.activeId);
  return { ...model, items, activeId: activeKept ? model.activeId : (items[0]?.id ?? '') };
}
