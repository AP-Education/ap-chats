import type { CallRecord } from '../types';

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
   * oidcUserId of every channel member still active in the workspace, for ring delivery.
   * `excludedMemberIds` leaves out, say, the member who triggered the notification
   * (a deliberate action, whose own UI already updates locally); pass none to notify
   * everyone, for an automatic event like a ring timing out, which whoever happened
   * to trigger the check must hear about too.
   */
  abstract ringRecipients(channelId: string, excludedMemberIds: string[]): Promise<string[]>;
}
