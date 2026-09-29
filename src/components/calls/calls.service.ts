import { randomUUID } from 'node:crypto';

import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { ChannelAccessFacade } from '@/components/communities/channel-access/channel-access.facade';
import type { ChannelAccessSnapshot } from '@/components/communities/channels/types/channel-access.types';
import { EntriesFacade } from '@/components/social/entries/entries.facade';
import type { WorkspaceMember } from '@/components/workspaces/members/types';
import { EventPublisher } from '@/globals/publisher/event-publisher';
import { RealtimePublisher } from '@/globals/realtime';

import { CALL_ENTRY_CREATED_EVENT, CallEntryCreatedEvent } from './events/call-entry-created.event';
import { CallProvider } from './provider';
import { CallsRepository } from './repository';
import type { CallRecord } from './types';

const ACTIVE_STATUSES = new Set(['ringing', 'active']);
const JOIN_TTL_SECONDS = 4 * 60 * 60;
// How long a call may ring before it reads as missed, same order of magnitude as a phone ring.
const RING_TTL_SECONDS = 45;

@Injectable()
export class CallsService {
  constructor(
    private readonly calls: CallsRepository,
    private readonly channelAccess: ChannelAccessFacade,
    private readonly entries: EntriesFacade,
    private readonly provider: CallProvider,
    private readonly realtime: RealtimePublisher,
    private readonly events: EventPublisher,
  ) {}

  async start(member: WorkspaceMember, channelId: string) {
    if (!this.provider.isConfigured) {
      throw new ServiceUnavailableException('Calls are not configured');
    }
    const channel = await this.channelAccess.requirePostAccess(member, channelId);
    await this.expireStale(member, channel);
    const { record, entry } = await this.startTransaction(member, channelId);
    if (entry) {
      this.events.publish(
        CALL_ENTRY_CREATED_EVENT,
        new CallEntryCreatedEvent(
          member.workspaceId,
          channelId,
          record.id,
          entry.seq.toString(),
          member.id,
        ),
      );
      await this.notify(member, channel, record, 'call:incoming');
    }
    return this.toView(record);
  }

  @Transactional()
  private async startTransaction(member: WorkspaceMember, channelId: string) {
    const id = randomUUID();
    const record = await this.calls.insert({
      id,
      workspaceId: member.workspaceId,
      channelId,
      roomName: `call-${id}`,
      startedByMemberId: member.id,
    });
    // Lost the race for this channel's one ringing/active call: no new position, no ring.
    if (record.id !== id) return { record, entry: null };
    const entry = await this.entries.appendCall(member.workspaceId, channelId, record.id);
    return { record, entry };
  }

  async active(member: WorkspaceMember, channelId: string) {
    const { channel } = await this.channelAccess.requireReadAccess(member, channelId);
    await this.expireStale(member, channel);
    const record = await this.calls.findActive(channelId);
    return record ? this.toView(record) : null;
  }

  async join(member: WorkspaceMember, channelId: string, callId: string) {
    const { channel, record } = await this.own(member, channelId, callId);
    if (!ACTIVE_STATUSES.has(record.status)) {
      throw new ForbiddenException('Call is no longer available');
    }
    if (record.status === 'ringing') {
      const activated = await this.calls.activate(record.id);
      if (activated) await this.notify(member, channel, activated, 'call:accepted');
    }
    const grant = await this.provider.mintJoinToken({
      roomName: record.roomName,
      identity: member.id,
      name: member.profile.displayName ?? member.id,
      ttlSeconds: JOIN_TTL_SECONDS,
    });
    // The call's real start, not this join: the timer a client renders from
    // it must read the same elapsed time whether you're joining fresh or
    // reconnecting after a reload.
    return { callId: record.id, roomName: record.roomName, startedAt: record.startedAt, ...grant };
  }

  /**
   * Declining is only a global, terminal action in a 1:1 call — there's
   * nobody left to talk to once the other side says no. In a channel, the
   * ring goes out to every member; one person ignoring it must never end
   * the call for whoever else might still answer, the same line Discord,
   * Slack and Telegram all draw between a DM call and a group one. A
   * channel "decline" is therefore a no-op here: the client clears its own
   * notification locally, and the call itself is untouched.
   */
  async decline(member: WorkspaceMember, channelId: string, callId: string) {
    const { channel } = await this.own(member, channelId, callId);
    if (channel.kind !== 'dm') return { ok: true };
    const updated = await this.calls.decline(callId);
    if (updated) await this.notify(member, channel, updated, 'call:declined');
    return { ok: true };
  }

  /**
   * A member disconnecting from the room, not a command to end it for
   * everyone: in a channel, the call only actually ends once the media room
   * is confirmed empty — whoever happens to trigger that check finishes it,
   * everyone else already left. A DM has no such waiting room: with only
   * two parties, either one leaving ends the call immediately for both, the
   * same way hanging up a phone doesn't wait for the line to go silent.
   */
  async leave(member: WorkspaceMember, channelId: string, callId: string) {
    const { channel, record } = await this.own(member, channelId, callId);
    if (!ACTIVE_STATUSES.has(record.status)) return { ok: true };
    if (channel.kind !== 'dm') {
      const remaining = await this.provider.countParticipants(record.roomName);
      if (remaining > 0) return { ok: true };
    }
    const updated = await this.calls.end(callId);
    if (updated) await this.notify(member, channel, updated, 'call:ended');
    return { ok: true };
  }

  private async expireStale(actor: WorkspaceMember, channel: ChannelAccessSnapshot) {
    const swept = await this.calls.sweepStale(
      channel.id,
      new Date(Date.now() - RING_TTL_SECONDS * 1000),
    );
    if (swept) await this.notify(actor, channel, swept, 'call:missed');
  }

  private async own(member: WorkspaceMember, channelId: string, callId: string) {
    // Post access, not read: joining/declining/ending a call is an action, and a
    // non-member reader of a public channel should not get a media credential.
    const channel = await this.channelAccess.requirePostAccess(member, channelId);
    const record = await this.calls.findOwn({ workspaceId: member.workspaceId, channelId, callId });
    if (!record) throw new NotFoundException('Call not found');
    return { channel, record };
  }

  /** Fans out to every other active channel member, on every device they're connected from. */
  private async notify(
    actor: WorkspaceMember,
    channel: ChannelAccessSnapshot,
    call: CallRecord,
    event: 'call:incoming' | 'call:accepted' | 'call:declined' | 'call:ended' | 'call:missed',
  ): Promise<void> {
    const recipients = await this.calls.ringRecipients(channel.id, actor.id);
    const payload = {
      workspaceId: channel.workspaceId,
      channelId: channel.id,
      channelKind: channel.kind,
      callId: call.id,
      roomName: call.roomName,
      startedByMemberId: actor.id,
      startedByDisplayName: actor.profile.displayName,
      startedByAvatarPath: actor.profile.avatarPath,
    };
    for (const oidcUserId of recipients) {
      this.realtime.toUser(oidcUserId, event, payload);
    }
  }

  private toView(record: CallRecord) {
    return {
      id: record.id,
      channelId: record.channelId,
      status: record.status,
      startedByMemberId: record.startedByMemberId,
      startedAt: record.startedAt,
      endedAt: record.endedAt,
    };
  }
}
