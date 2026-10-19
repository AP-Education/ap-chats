import * as SecureStore from 'expo-secure-store';

const PUT_OFF_KEY = 'ap-app.call-readiness-put-off';
const RANG_IN_THE_DARK_KEY = 'ap-app.call-rang-in-the-dark';

export async function hasPutOffCallReadiness(): Promise<boolean> {
  return (await SecureStore.getItemAsync(PUT_OFF_KEY)) === '1';
}

export async function putOffCallReadiness(): Promise<void> {
  await SecureStore.setItemAsync(PUT_OFF_KEY, '1');
}

export async function hasRungInTheDark(): Promise<boolean> {
  return (await SecureStore.getItemAsync(RANG_IN_THE_DARK_KEY)) === '1';
}

export async function rememberRingInTheDark(): Promise<void> {
  await SecureStore.setItemAsync(RANG_IN_THE_DARK_KEY, '1');
}

export async function forgetRingInTheDark(): Promise<void> {
  await SecureStore.deleteItemAsync(RANG_IN_THE_DARK_KEY);
}
