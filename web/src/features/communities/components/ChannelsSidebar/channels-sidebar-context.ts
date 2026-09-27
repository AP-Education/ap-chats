import { createContext, useContext } from 'react';

import type { WorkspaceMember } from '@/features/workspaces/types';

import type { Channel } from '../../channels/types';

export interface CreateChannelTarget {
  categoryId?: string;
  categoryName: string;
}

export interface ChannelsSidebarStore {
  workspaceId: string;
  currentMember: WorkspaceMember | undefined;
  selectedChannelId: string | undefined;
  unreadByChannel: Map<string, number>;
  onNavigate: (() => void) | undefined;
  requestCreateChannel: (target: CreateChannelTarget) => void;
  draggingChannel: Channel | null;
  setDraggingChannel: (channel: Channel | null) => void;
  moveChannel: (channel: Channel, categoryId: string | null) => void;
}

export const ChannelsSidebarContext = createContext<ChannelsSidebarStore | null>(null);

// Shared by every ChannelSectionView/ChannelRow in the tree so they don't
// each need selectedChannelId/onNavigate/requestCreateChannel threaded
// through as props.
export function useChannelsSidebarStore(): ChannelsSidebarStore {
  const value = useContext(ChannelsSidebarContext);
  if (!value) {
    throw new Error('useChannelsSidebarStore must be used within ChannelsSidebar');
  }
  return value;
}
