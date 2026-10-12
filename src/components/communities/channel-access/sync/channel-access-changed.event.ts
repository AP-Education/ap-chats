import type { MembershipChanges, MembershipScope } from '../../memberships/types';

export const CHANNEL_ACCESS_CHANGED_EVENT = 'communities.channel.access-changed';

export class ChannelAccessChangedEvent {
  constructor(
    /** What was recalculated: every person of these channels, or every channel of these people. */
    public readonly scope: MembershipScope,
    public readonly changes: MembershipChanges,
  ) {}
}
