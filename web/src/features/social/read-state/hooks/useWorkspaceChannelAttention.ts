import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useQueryAuth } from '@/features/auth/hooks/useQueryAuth';
import { useWorkspaceNotify } from '@/features/communities/notifications/hooks/useWorkspaceNotifications';

import { type Attention, channelsAttention } from '../conversation-attention';
import { workspaceUnreadQuery } from './useWorkspaceUnread';

/** A workspace's channels as its rail tile shows them, from the counts kept live for every one. */
export function useWorkspaceChannelAttention(workspaceId: string): Attention {
  const { token, identity } = useQueryAuth();
  const { data: conversations } = useQuery(workspaceUnreadQuery(identity, token, workspaceId));
  const notify = useWorkspaceNotify(workspaceId);

  return useMemo(() => channelsAttention(conversations, notify), [conversations, notify]);
}
