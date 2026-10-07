import type { RealtimeSocketClient } from '@/features/realtime/types';
import { postToNative } from '@/shared/lib/nativeBridge';

import type { NotificationsToNativeMessage } from '../types';

/** While attending, the server holds every device's pushes back; it forgets a silent connection. */
export function reportAttention(socket: RealtimeSocketClient, attending: boolean): void {
  socket.emit('attention:update', { attending });
}

/** Inside the native shell, the shell skips its own foreground banner instead. */
export function reportAttentionToShell(attending: boolean): void {
  const message: NotificationsToNativeMessage = {
    type: 'notifications/context',
    payload: { attending },
  };
  postToNative(message);
}
