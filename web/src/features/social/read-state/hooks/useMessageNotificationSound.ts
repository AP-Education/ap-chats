import { useEffect } from 'react';

import { useWebPush } from '@/features/devices/browser-push';
import { useSocketEvent } from '@/features/realtime/hooks/useSocketEvent';
import { getSharedAudioContext } from '@/shared/audio/audio-context';
import { isPageVisible } from '@/shared/hooks/useIsPageVisible';

import { playMessageBloop } from '../sound/messageBloop';

export function useMessageNotificationSound(
  workspaceId: string,
  openChannelId: string | undefined,
): void {
  const push = useWebPush();
  useEffect(() => {
    if (!window.ReactNativeWebView) getSharedAudioContext();
  }, []);

  useSocketEvent('social:unread', (event) => {
    if (event.workspaceId !== workspaceId) return;
    if (!event.alert) return;
    if (push.enabled && !isPageVisible()) return;
    if (event.channelId === openChannelId && isPageVisible()) return;
    playMessageBloop();
  });
}
