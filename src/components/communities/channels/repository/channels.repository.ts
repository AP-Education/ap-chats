import type { Channel, ListedChannel } from '../types';

export abstract class ChannelsRepository {
  /** The named channels in the person's lists. */
  abstract findListedFor(workspaceId: string, memberId: string): Promise<ListedChannel[]>;
  /** Every named channel, with what the person's lists give them in each. */
  abstract findAllAsSeenBy(workspaceId: string, memberId: string): Promise<ListedChannel[]>;
  abstract findById(workspaceId: string, channelId: string): Promise<Channel | undefined>;
  abstract findAsSeenBy(
    workspaceId: string,
    channelId: string,
    memberId: string,
  ): Promise<ListedChannel | undefined>;
  abstract create(
    workspaceId: string,
    creatorMemberId: string,
    values: { name: string; categoryId: string | null },
  ): Promise<Channel>;
  abstract update(
    workspaceId: string,
    channelId: string,
    changes: { name?: string; categoryId?: string | null },
  ): Promise<Channel | undefined>;
  abstract remove(workspaceId: string, channelId: string): Promise<boolean>;
}
