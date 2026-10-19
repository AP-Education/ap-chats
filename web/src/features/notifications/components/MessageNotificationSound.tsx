import { isNativeShell, useIsAppActive } from '@ap-education/shell-sdk';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { useSocketEvent } from '@/features/realtime/hooks/useSocketEvent';
import { getSharedAudioContext } from '@/shared/audio/audio-context';
import { isAttending } from '@/shared/hooks/useIsAttending';

import { usePush } from '../hooks/usePush';
import { openConversationAt } from '../open-conversation';
import { playMessageBloop } from '../sound/messageBloop';

/** The app's own sound for a message from any workspace, quiet for the conversation on screen. */
export function MessageNotificationSound() {
  const push = usePush();
  const { pathname } = useLocation();
  // While another application is in front, the router keeps the last Chats path.
  const openChannelId = useIsAppActive() ? openConversationAt(pathname) : undefined;

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

  return null;
}
