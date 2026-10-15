import * as SecureStore from 'expo-secure-store';

const KEY = 'ap-app.call-readiness-put-off';

export async function hasPutOffCallReadiness(): Promise<boolean> {
  return (await SecureStore.getItemAsync(KEY)) === '1';
}

export async function putOffCallReadiness(): Promise<void> {
  await SecureStore.setItemAsync(KEY, '1');
}
