import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { loadCallKitModule } from '../utils/callkit-module';
import { readRingEnding } from '../utils/ring-ending';

const RING_ENDED_TASK = 'calls.ring-ended';

// Android rings straight from the push service, with no app running to hear that the call was
// answered, declined or called off elsewhere. That news comes as another push, and a background
// notification task runs for it even then; it has to be defined before the app renders.
TaskManager.defineTask<Notifications.NotificationTaskPayload>(RING_ENDED_TASK, async ({ data }) => {
  const ending = readRingEnding(data);
  if (!ending) return;

  const CallKit = await loadCallKitModule();
  const session = await CallKit?.getActiveCallSession();
  const isThisRing =
    session?.status === 'ringing' && session.incomingCallEvent?.serverCallId === ending.callId;
  if (CallKit && session && isThisRing) await CallKit.reportCallEnded(session.id, ending.reason);
});

if (Platform.OS === 'android') {
  void Notifications.registerTaskAsync(RING_ENDED_TASK).catch(() => undefined);
}
