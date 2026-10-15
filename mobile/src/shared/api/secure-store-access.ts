import * as SecureStore from 'expo-secure-store';

/** A ring wakes a locked phone too, and answering it still reads the session and device keys. */
export const READABLE_WHEN_LOCKED: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};
