import { createContext, useContext } from 'react';

import type { Attention } from '@/features/social/read-state/conversation-attention';

import type { Channel } from '../../channels/types';

export interface ChannelsSidebarStore {
  workspaceId: string;
  selectedChannelId: string | undefined;
  openChannelId: string | undefined;
  attentionByChannel: Map<string, Attention>;
  onNavigate: (() => void) | undefined;
  draggingChannel: Channel | null;
  setDraggingChannel: (channel: Channel | null) => void;
  moveChannel: (channel: Channel, categoryId: string | null) => void;
}

export const ChannelsSidebarContext = createContext<ChannelsSidebarStore | null>(null);

// Shared by every ChannelSectionView/ChannelRow in the tree so they don't
// each need selectedChannelId/onNavigate threaded through as props.
export function useChannelsSidebarStore(): ChannelsSidebarStore {
  const value = useContext(ChannelsSidebarContext);
  if (!value) {
    throw new Error('useChannelsSidebarStore must be used within ChannelsSidebar');
  }
  return value;
}
