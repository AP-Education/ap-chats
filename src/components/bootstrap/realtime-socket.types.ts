import type { DefaultEventsMap, Socket } from 'socket.io';

import type { AuthenticatedUser } from '@/components/auth';

export interface RealtimeSocketData {
  principal?: AuthenticatedUser;
}

export type RealtimeSocket = Socket<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  RealtimeSocketData
>;
