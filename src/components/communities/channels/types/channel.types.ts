import type { ChannelKind } from './channel-kind.types';

export interface Channel {
  id: string;
  workspaceId: string;
  categoryId: string | null;
  kind: ChannelKind;
  name: string | null;
  createdByMemberId: string;
  createdAt: Date;
  updatedAt: Date;
}

/** What the channel's lists give one person; `null` when they are not in any of them. */
export interface ListedAccess {
  canPost: boolean;
  canManage: boolean;
}

export interface ListedChannel extends Channel {
  isOpen: boolean;
  listed: ListedAccess | null;
}

export interface ChannelView extends Channel {
  /** The whole workspace sees it. */
  isOpen: boolean;
  /** It is in the person's lists, so in their sidebar. */
  isMember: boolean;
  canPost: boolean;
  canManage: boolean;
}
