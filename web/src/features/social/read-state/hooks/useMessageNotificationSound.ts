import { useEffect } from 'react';

import { usePush } from '@/features/notifications/hooks/usePush';
import { useSocketEvent } from '@/features/realtime/hooks/useSocketEvent';
import { getSharedAudioContext } from '@/shared/audio/audio-context';
import { isAttending } from '@/shared/hooks/useIsAttending';

import { playMessageBloop } from '../sound/messageBloop';

export function useMessageNotificationSound(
  workspaceId: string,
  openChannelId: string | undefined,
): void {
  const push = usePush();
  useEffect(() => {
    if (!window.ReactNativeWebView) getSharedAudioContext();
  }, []);

  useSocketEvent('social:unread', (event) => {
    if (event.workspaceId !== workspaceId || !event.alert) return;

    // Presence uses the same test, so the server pushes exactly when this stays silent.
    const attending = isAttending();
    if (push.enabled && !attending) return;
    if (event.channelId === openChannelId && attending) return;

    playMessageBloop();
  });
}
