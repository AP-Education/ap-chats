import { Linking } from 'react-native';

import { getPushPermissionStatus, requestPushPermission } from './push-token';
import { registerCurrentDeviceForPush } from './register-current-device';

// The OS owns this switch: it asks once while undecided, and afterwards only Settings can change it.
export async function changePushPermission(): Promise<void> {
  if ((await getPushPermissionStatus()) !== 'undetermined') return Linking.openSettings();

  await requestPushPermission();
  await registerCurrentDeviceForPush().catch(() => {});
}
