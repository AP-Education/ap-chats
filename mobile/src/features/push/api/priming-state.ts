import * as SecureStore from 'expo-secure-store';

const KEY = 'ap-app.push-priming-shown';

export async function hasShownPushPriming(): Promise<boolean> {
  return (await SecureStore.getItemAsync(KEY)) === '1';
}

export async function markPushPrimingShown(): Promise<void> {
  await SecureStore.setItemAsync(KEY, '1');
}
