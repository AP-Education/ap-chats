import type { ChannelMembership, MembershipChanges, MembershipScope } from '../types';

export abstract class ChannelMembershipsRepository {
  abstract findAllActiveForChannel(channelId: string): Promise<ChannelMembership[]>;
  /** Adds whoever the lists now cover and removes whoever they no longer do. */
  abstract reconcile(scope: MembershipScope): Promise<MembershipChanges>;
}
