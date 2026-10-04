import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useSocketEvent } from '@/features/realtime/hooks/useSocketEvent';
import { useConnection } from '@/features/realtime/stores/realtime-context';

import { refreshChannelInventory } from './channel-inventory-cache';
import type { CommunityServerToClientEvents } from './types';

export function ChannelListRealtime() {
  const { identity } = useQueryAuth();
  const { socket, status } = useConnection();
  const queryClient = useQueryClient();
  const refreshedSession = useRef<{ identity: string; socketId: string } | null>(null);

  const refreshSessionInventory = useCallback(() => {
    if (!identity || !socket?.id) return;
    if (
      refreshedSession.current?.identity === identity &&
      refreshedSession.current.socketId === socket.id
    )
      return;

    refreshedSession.current = { identity, socketId: socket.id };
    void refreshChannelInventory(queryClient, identity);
  }, [identity, queryClient, socket]);

  useSocketEvent<CommunityServerToClientEvents>('communities:changed', (event) => {
    if (!identity || event.type !== 'communities.channel.created') return;
    void refreshChannelInventory(queryClient, identity, event.workspaceId);
  });

  useSocketEvent('session:ready', refreshSessionInventory);

  useEffect(() => {
    if (status === 'connected') {
      // The initial session:ready can arrive before this component subscribes.
      refreshSessionInventory();
    }
  }, [refreshSessionInventory, status]);

  return null;
}
