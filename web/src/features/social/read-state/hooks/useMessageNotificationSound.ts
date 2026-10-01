import { useSocketEvent } from '@/features/realtime/hooks/useSocketEvent';
import { isPageVisible } from '@/shared/hooks/useIsPageVisible';

import { playMessageBloop } from '../sound/messageBloop';

export function useMessageNotificationSound(
  workspaceId: string,
  openChannelId: string | undefined,
): void {
  useSocketEvent('social:unread', (event) => {
    if (event.workspaceId !== workspaceId) return;
    if (!event.alert) return;
    if (event.channelId === openChannelId && isPageVisible()) return;
    playMessageBloop();
  });
}
