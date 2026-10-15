import { isNativeShell } from '@ap-education/shell-sdk';
import { useEffect } from 'react';

import { usePush } from '@/features/notifications/hooks/usePush';
import { useSocketEvent } from '@/features/realtime/hooks/useSocketEvent';
import { getSharedAudioContext } from '@/shared/audio/audio-context';
import { isAttending } from '@/shared/hooks/useIsAttending';

import { playMessageBloop } from '../sound/messageBloop';

export function useMessageNotificationSound(openChannelId: string | undefined): void {
  const push = usePush();
  useEffect(() => {
    if (!isNativeShell()) getSharedAudioContext();
  }, []);

  useSocketEvent('social:unread', (event) => {
    if (!event.alert) return;

    // A push only shows while no app window is in front (see push-sw.js), so this is the alert then.
    if (push.enabled && !isAttending()) return;

    const isOpen = event.channelId === openChannelId;
    if (isOpen && isAttending()) return;

    playMessageBloop();
  });
}
