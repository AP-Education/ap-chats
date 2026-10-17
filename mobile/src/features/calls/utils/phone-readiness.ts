import { Platform } from 'react-native';

import {
  askToRunUnrestricted,
  openAppSettings,
  openCallChannelSettings,
  openFullScreenCallSettings,
  openNotificationSettings,
  readAndroidCallChecks,
} from '../../../../modules/call-readiness';
import { changePushPermission } from '../../push/api/change-push-permission';
import { getPushPermissionStatus } from '../../push/api/push-token';
import {
  isReachableByCalls,
  registerCurrentDeviceForPush,
} from '../../push/api/register-current-device';
import type { PhoneCheck, PhoneCheckId } from '../types';

/** What lets a call reach and ring this phone, in the order a person sets it up. */
export async function readPhoneReadiness(): Promise<PhoneCheck[]> {
  const android = readAndroidCallChecks();
  const notifications = android?.notifications ?? (await getPushPermissionStatus()) === 'granted';
  const ringing: PhoneCheck[] = android
    ? [
        { id: 'ringsAloud', ok: android.ringsAloud },
        { id: 'fullScreen', ok: android.fullScreen },
        { id: 'unrestricted', ok: android.unrestricted },
        { id: 'backgroundAllowed', ok: android.backgroundAllowed },
      ]
    : [];

  return [
    { id: 'notifications', ok: notifications },
    ...ringing,
    { id: 'registered', ok: isReachableByCalls() },
  ];
}

/** Opens where the person changes it, or registers the phone again. */
export async function fixPhoneReadiness(id: PhoneCheckId): Promise<void> {
  switch (id) {
    case 'notifications':
      return Platform.OS === 'android' ? openNotificationSettings() : changePushPermission();
    case 'ringsAloud':
      return openCallChannelSettings();
    case 'fullScreen':
      return openFullScreenCallSettings();
    case 'unrestricted':
      return askToRunUnrestricted();
    case 'backgroundAllowed':
      return openAppSettings();
    case 'registered':
      return registerCurrentDeviceForPush();
  }
}
