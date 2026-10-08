import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { PushPermission } from '../types';

export async function ensureMessageChannel(): Promise<void> {
  if (Platform.OS === 'android')
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Повідомлення',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
}

export async function getPushPermissionStatus(): Promise<PushPermission> {
  return (await Notifications.getPermissionsAsync()).status;
}

export async function requestPushPermission(): Promise<boolean> {
  await ensureMessageChannel();
  return (
    (await Notifications.requestPermissionsAsync()).status ===
    Notifications.PermissionStatus.GRANTED
  );
}

export async function getExpoPushToken(): Promise<string | null> {
  await ensureMessageChannel();
  const permissions = await Notifications.getPermissionsAsync();
  if (
    !permissions.granted &&
    permissions.ios?.status !== Notifications.IosAuthorizationStatus.PROVISIONAL
  )
    return null;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId || Constants.executionEnvironment === 'storeClient') return null;
  return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}
