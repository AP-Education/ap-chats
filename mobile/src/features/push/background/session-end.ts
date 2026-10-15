import { useAuthStore } from '../../auth';
import { dismissPresentedNotifications } from '../api/presented-notifications';
import { releaseCurrentDevice } from '../api/release-current-device';

// A logout and a refused renewal both end the session, with a screen up or none at all: the phone
// stops getting this account's pushes and calls, and its previews leave for whoever is next.
useAuthStore.subscribe((state, previous) => {
  const sessionEnded = previous.status === 'signed-in' && state.status !== 'signed-in';
  if (!sessionEnded) return;

  void releaseCurrentDevice();
  void dismissPresentedNotifications();
});
