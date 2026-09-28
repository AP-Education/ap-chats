import type { ChannelEntry, EntryPosition } from '../types/entry.types';

export abstract class EntriesRepository {
  abstract append(workspaceId: string, channelId: string, messageId: string): Promise<ChannelEntry>;
  abstract appendMany(
    workspaceId: string,
    channelId: string,
    messageIds: string[],
  ): Promise<EntryPosition[]>;
}
