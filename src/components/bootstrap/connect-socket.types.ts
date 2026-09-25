import type { DefaultEventsMap, Socket } from 'socket.io';

import type { AuthenticatedUser } from '@/components/auth';

export interface ConnectSocketData {
  principal?: AuthenticatedUser;
  expiresAt?: number;
  expiryTimer?: ReturnType<typeof setTimeout>;
}

export type ConnectSocket = Socket<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  ConnectSocketData
>;
