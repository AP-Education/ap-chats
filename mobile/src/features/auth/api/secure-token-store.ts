import * as SecureStore from 'expo-secure-store';

import type { TokenSet, TokenStore } from '../types';

const KEY = 'ap-connect.tokens';

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
    await SecureStore.setItemAsync(KEY, JSON.stringify(tokens));
  }

  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(KEY);
  }
}
