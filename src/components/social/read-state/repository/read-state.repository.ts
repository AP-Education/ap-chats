import type { ReadPosition, ReadPositionQuery, WorkspaceChannelUnread } from '../types';

export abstract class ReadStateRepository {
  abstract workspaceSummary(
    workspaceId: string,
    memberId: string,
  ): Promise<WorkspaceChannelUnread[]>;
  abstract position(query: ReadPositionQuery): Promise<ReadPosition>;
  abstract lastReadSeq(channelId: string, memberId: string): Promise<bigint | null>;
  abstract entryExists(channelId: string, seq: bigint): Promise<boolean>;
  abstract advance(channelId: string, memberId: string, seq: bigint): Promise<void>;
  abstract rewind(channelId: string, memberId: string, seq: bigint): Promise<void>;
}
