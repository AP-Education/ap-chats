import type { ChannelKind } from './channel-kind.types';

export interface ChannelAccessSnapshot {
  id: string;
  workspaceId: string;
  kind: ChannelKind;
  createdByMemberId: string;
  lastEntrySeq: bigint;
}
