import { User } from 'oidc-client-ts';

import { getOidcConfig } from './oidc-config';

/**
 * The user oidc-client-ts kept from the last sign-in, read synchronously. The library
 * loads the same entry asynchronously; reading it here lets the shell render on the
 * first frame instead of after that load.
 */
export function readStoredOidcUser(): User | null {
  const { issuer, clientId } = getOidcConfig();
  const stored = sessionStorage.getItem(`oidc.user:${issuer}:${clientId}`);
  if (!stored) return null;
  try {
    const user = User.fromStorageString(stored);
    return user.expired ? null : user;
  } catch {
    return null;
  }
}
