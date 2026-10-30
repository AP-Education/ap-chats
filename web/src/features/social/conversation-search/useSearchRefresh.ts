import { useQueryClient } from '@tanstack/react-query';

import type {
  CommunityServerToClientEvents,
  WorkspaceAccessEvent,
} from '@/features/communities/realtime/types';
import { useSocketEvent } from '@/features/realtime/hooks/useSocketEvent';

/** An open directory follows access changes; a closed search retains no result cache. */
export function useSearchRefresh(identity: string | undefined, workspaceId: string) {
  const client = useQueryClient();
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ['conversation-search', identity, workspaceId] });
  };
  const changed = (event: WorkspaceAccessEvent) => {
    if (event.workspaceId === workspaceId) refresh();
  };
  useSocketEvent<CommunityServerToClientEvents>('communities:channel-granted', changed);
  useSocketEvent<CommunityServerToClientEvents>('communities:channel-revoked', changed);
  useSocketEvent<CommunityServerToClientEvents>('communities:access-changed', changed);
  useSocketEvent('session:ready', refresh);
}
