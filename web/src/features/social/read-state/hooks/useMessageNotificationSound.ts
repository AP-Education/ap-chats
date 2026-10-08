import { isNativeShell } from '@ap-education/shell-sdk';
import { useEffect } from 'react';

import { usePush } from '@/features/notifications/hooks/usePush';
import { useSocketEvent } from '@/features/realtime/hooks/useSocketEvent';
import { getSharedAudioContext } from '@/shared/audio/audio-context';
import { isAttending, isPresent } from '@/shared/hooks/useIsAttending';

import { playMessageBloop } from '../sound/messageBloop';

export function useMessageNotificationSound(
  workspaceId: string,
  openChannelId: string | undefined,
): void {
  const push = usePush();
  useEffect(() => {
    if (!isNativeShell()) getSharedAudioContext();
  }, []);

  useSocketEvent('social:unread', (event) => {
    if (!event.alert) return;

    // The server holds pushes back by the same test, so this stays silent exactly when it pushes.
    if (push.enabled && !isPresent()) return;

    const isOpen = event.workspaceId === workspaceId && event.channelId === openChannelId;
    if (isOpen && isAttending()) return;

    playMessageBloop();
  });
}
