import type { ChannelMemberPair, ParticipationChanges, ParticipationScope } from '../types';

export abstract class ParticipationRepository {
  /** Adds whoever the lists now cover and removes whoever they no longer do. */
  abstract reconcile(scope: ParticipationScope): Promise<ParticipationChanges>;
  /** Everyone in the channel right now. */
  abstract participants(workspaceId: string, channelId: string): Promise<ChannelMemberPair[]>;
}
