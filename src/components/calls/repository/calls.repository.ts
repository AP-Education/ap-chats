import type { CallRecord } from '../types';

export interface CallHistoryParticipant {
  memberId: string;
  displayName: string | null;
  avatarPath: string | null;
  active: boolean;
}

// "missed" is only what rang for you and went unanswered, never your own unanswered dial.
export type CallHistoryFilter = 'all' | 'missed';

export abstract class CallsRepository {
  /** Conflicts when the channel already holds a ringing/active call. */
  abstract insert(input: {
    id: string;
    workspaceId: string;
    channelId: string;
    roomName: string;
    startedByMemberId: string;
  }): Promise<CallRecord>;

  abstract findActive(channelId: string): Promise<CallRecord | undefined>;

  abstract findOwn(input: {
    workspaceId: string;
    channelId: string;
    callId: string;
  }): Promise<CallRecord | undefined>;

  /** 'ringing' -> 'active'; a no-op update (returns undefined) once already active. */
  abstract activate(callId: string): Promise<CallRecord | undefined>;

  /** 'ringing' | 'active' -> 'declined'; a no-op once already resolved. */
  abstract decline(callId: string): Promise<CallRecord | undefined>;

  /** 'ringing' | 'active' -> 'ended'; a no-op once already resolved. */
  abstract end(callId: string): Promise<CallRecord | undefined>;

  /**
   * 'ringing' -> 'missed' for this channel's call if it started before `olderThan`;
   * a no-op (returns undefined) if there is none or it already rang out in some other way.
   */
  abstract sweepStale(channelId: string, olderThan: Date): Promise<CallRecord | undefined>;

  /**
   * oidcUserId of every active member of the channel, for ring delivery.
   * `excludeMemberId` leaves out the member who triggered the notification
   * (a deliberate action, whose own UI already updates locally); pass `null`
   * to notify everyone, for an automatic event like a ring timing out, which
   * whoever happened to trigger the check must hear about too.
   */
  abstract ringRecipients(channelId: string, excludeMemberId: string | null): Promise<string[]>;

  /**
   * A person's calls tab across every workspace they are active in, Discord/Slack-style:
   * DM calls only, the other side's profile riding along so the client can render and
   * re-dial without a second round trip. Group/channel calls have no single "other
   * participant" and stay out of this list, the same line CallsService.decline() already
   * draws between a DM call and a channel one.
   */
  abstract listForUser(
    userId: string,
    filter: CallHistoryFilter,
    cursor: { startedAt: Date; id: string } | undefined,
    limit: number,
  ): Promise<Array<CallRecord & { participant: CallHistoryParticipant }>>;
}
