import { createContext, useContext } from 'react';

import type { ChannelUnread } from './hooks/useWorkspaceUnread';

export interface WorkspaceUnreadStore {
  unreadByChannel: Map<string, number>;
  channelTotal: number;
  directTotal: number;
}

export function createWorkspaceUnreadStore(
  channels: ChannelUnread[] | undefined,
): WorkspaceUnreadStore {
  const unreadByChannel = new Map<string, number>();
  let channelTotal = 0;
  let directTotal = 0;
  for (const channel of channels ?? []) {
    unreadByChannel.set(channel.channelId, channel.unreadCount);
    if (channel.kind === 'dm') directTotal += channel.unreadCount;
    else channelTotal += channel.unreadCount;
  }
  return { unreadByChannel, channelTotal, directTotal };
}

export const WorkspaceUnreadContext = createContext<WorkspaceUnreadStore | null>(null);

export function useWorkspaceUnreadStore(): WorkspaceUnreadStore {
  const value = useContext(WorkspaceUnreadContext);
  if (!value) {
    throw new Error('useWorkspaceUnreadStore must be used within WorkspaceUnreadContext.Provider');
  }
  return value;
}
