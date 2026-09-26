import type { ChannelKind } from './channel-kind.types';

export interface Channel {
  id: string;
  workspaceId: string;
  categoryId: string | null;
  kind: ChannelKind;
  name: string;
  createdByMemberId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChannelView extends Channel {
  isMember: boolean;
}
