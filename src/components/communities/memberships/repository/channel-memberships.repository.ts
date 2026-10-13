import type { ChannelMembership } from '../types';

export abstract class ChannelMembershipsRepository {
  abstract findAllActiveForChannel(channelId: string): Promise<ChannelMembership[]>;
}
