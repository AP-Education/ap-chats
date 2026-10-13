import type { CallHistoryEntry, CallHistoryFilter } from '../types';

export abstract class CallsHistoryRepository {
  /**
   * A person's calls tab across every workspace they are active in, Discord/Slack-style:
   * DM calls only, the other side's profile riding along so the client can render and
   * re-dial without a second round trip. Group/channel calls have no single "other
   * participant" and stay out of this list, the same line a DM decline draws.
   */
  abstract listForUser(
    userId: string,
    filter: CallHistoryFilter,
    cursor: { startedAt: Date; id: string } | undefined,
    limit: number,
  ): Promise<CallHistoryEntry[]>;
}
