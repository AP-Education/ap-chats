import type { Channel, ChannelKind, ChannelView } from '../types';

export abstract class ChannelsRepository {
  abstract findAllForMember(
    workspaceId: string,
    memberId: string,
    scope: 'available' | 'joined',
  ): Promise<ChannelView[]>;
  abstract findById(workspaceId: string, channelId: string): Promise<Channel | undefined>;
  abstract create(
    workspaceId: string,
    creatorMemberId: string,
    values: { name: string; kind: ChannelKind; categoryId: string | null },
  ): Promise<Channel>;
  abstract update(
    workspaceId: string,
    channelId: string,
    changes: { name?: string; categoryId?: string | null },
  ): Promise<Channel | undefined>;
  abstract setArchived(
    workspaceId: string,
    channelId: string,
    archived: boolean,
  ): Promise<Channel | undefined>;
}
