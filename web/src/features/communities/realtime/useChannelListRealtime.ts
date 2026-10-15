import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useSocketEvent } from '@/features/realtime/hooks/useSocketEvent';
import { useConnection } from '@/features/realtime/stores/realtime-context';

import { refreshChannelInventory, refreshChannelRights } from './channel-inventory-cache';
import { type InventorySession, isNewSession } from './inventory-session';
import type {
  ChannelAccessEvent,
  CommunityServerToClientEvents,
  WorkspaceAccessEvent,
} from './types';

/** Keeps the person's channel lists in step with the access changes the server announces. */
export function useChannelListRealtime(): void {
  const { identity } = useQueryAuth();
  const { socket, status } = useConnection();
  const queryClient = useQueryClient();
  const refreshedSession = useRef<InventorySession | null>(null);

  const refreshSessionInventory = useCallback(() => {
    if (!identity || !socket?.id) return;
    const session = { identity, socketId: socket.id };
    if (!isNewSession(refreshedSession.current, session)) return;

    refreshedSession.current = session;
    void refreshChannelInventory(queryClient, identity);
  }, [identity, queryClient, socket]);

  useSocketEvent<CommunityServerToClientEvents>(
    'communities:channel-granted',
    (event: ChannelAccessEvent) => {
      if (identity) void refreshChannelInventory(queryClient, identity, event.workspaceId);
    },
  );

  useSocketEvent<CommunityServerToClientEvents>(
    'communities:channel-revoked',
    (event: ChannelAccessEvent) => {
      if (!identity) return;
      void refreshChannelInventory(queryClient, identity, event.workspaceId);
      void refreshChannelRights(queryClient, identity, event.workspaceId, event.channelId);
    },
  );

  useSocketEvent<CommunityServerToClientEvents>(
    'communities:channel-permissions-changed',
    (event: ChannelAccessEvent) => {
      if (identity)
        void refreshChannelRights(queryClient, identity, event.workspaceId, event.channelId);
    },
  );

  useSocketEvent<CommunityServerToClientEvents>(
    'communities:access-changed',
    (event: WorkspaceAccessEvent) => {
      if (identity) void refreshChannelRights(queryClient, identity, event.workspaceId);
    },
  );

  useSocketEvent('session:ready', refreshSessionInventory);

  useEffect(() => {
    if (status === 'connected') {
      // The initial session:ready can arrive before this hook subscribes.
      refreshSessionInventory();
    }
  }, [refreshSessionInventory, status]);
}
