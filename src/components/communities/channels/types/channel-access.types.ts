import type { ChannelKind } from './channel-kind.types';

/** A channel as seen by one of its participants at the moment of a check. */
export interface ChannelAccessSnapshot {
  id: string;
  workspaceId: string;
  kind: ChannelKind;
  lastEntrySeq: bigint;
  canPost: boolean;
  /** From the channel's own lists; workspace managers manage every channel on top of this. */
  canManage: boolean;
}
