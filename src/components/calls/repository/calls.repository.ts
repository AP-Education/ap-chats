import type { CallRecord } from '../types';

export abstract class CallsRepository {
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

  /** 'ringing' -> 'declined'; a no-op once accepted or already resolved. */
  abstract decline(callId: string): Promise<CallRecord | undefined>;

  /** 'ringing' | 'active' -> 'ended'; a no-op once already resolved. */
  abstract end(callId: string): Promise<CallRecord | undefined>;

  /**
   * 'ringing' -> 'missed' for this channel's call if it started before `olderThan`;
   * a no-op (returns undefined) if there is none or it already rang out in some other way.
   */
  abstract sweepStale(channelId: string, olderThan: Date): Promise<CallRecord | undefined>;

  /** oidcUserId of every other active member of the channel, for ring delivery. */
  abstract ringRecipients(channelId: string, excludeMemberId: string): Promise<string[]>;
}
