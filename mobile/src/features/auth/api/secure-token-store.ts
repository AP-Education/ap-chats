import * as SecureStore from 'expo-secure-store';

import { READABLE_WHEN_LOCKED } from '../../../shared/api/secure-store-access';
import type { TokenSet, TokenStore } from '../types';

const KEY = 'ap-app.tokens';

/** SecureStore-backed TokenStore. Keychain on iOS, Keystore-backed EncryptedSharedPreferences on Android. */
export class SecureTokenStore implements TokenStore {
  async load(): Promise<TokenSet | null> {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as TokenSet;
    } catch {
      return null;
    }
  }

  async save(tokens: TokenSet): Promise<void> {
    // A rewrite keeps an item's old accessibility, so the item is recreated to apply this one.
    await SecureStore.deleteItemAsync(KEY);
    await SecureStore.setItemAsync(KEY, JSON.stringify(tokens), READABLE_WHEN_LOCKED);
  }

  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(KEY);
  }
}
