import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export async function getPushPermissionStatus(): Promise<Notifications.PermissionStatus> {
  return (await Notifications.getPermissionsAsync()).status;
}

// The OS shows its permission dialog at most once — call this only from an explicit
// user action (see PushPrimingGate), never on a background/automatic path.
export async function requestPushPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === Notifications.PermissionStatus.GRANTED;
}

// Never prompts — only uses a permission that's already granted.
export async function getExpoPushToken(): Promise<string | null> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== Notifications.PermissionStatus.GRANTED) return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    if (!projectId) {
      if (__DEV__) console.warn('[push] no extra.eas.projectId in app.json, skipping token fetch');
      return null;
    }

    return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch (error) {
    // Expo Go (no remote push since SDK 53) or a transient Expo API failure —
    // registration is best-effort, never fatal to the app.
    if (__DEV__) console.warn('[push] getExpoPushTokenAsync failed', error);
    return null;
  }
}
