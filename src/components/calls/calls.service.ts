import { randomUUID } from 'node:crypto';

import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { ChannelAccessFacade } from '@/components/communities/channel-access';
import type { ChannelAccessSnapshot } from '@/components/communities/channels/types/channel-access.types';
import { EntriesFacade } from '@/components/social/entries/entries.facade';
import type { ChannelEntry } from '@/components/social/entries/types/entry.types';
import type { WorkspaceMember } from '@/components/workspaces/members/types';
import { EventOutbox } from '@/globals/publisher/event-outbox';
import { EventPublisher } from '@/globals/publisher/event-publisher';
import { RealtimePublisher } from '@/globals/realtime';

import { CALL_ENTRY_CREATED_EVENT, CallEntryCreatedEvent } from './events/call-entry-created.event';
import {
  CALL_SIGNAL_EVENT,
  CallSignalEvent,
  type CallSignalKind,
} from './events/call-signal.event';
import { CallProvider } from './provider';
import { type CallHistoryFilter, CallsRepository } from './repository';
import type { CallRecord, CallStatus } from './types';

const LIVE_STATUSES = new Set<CallStatus>(['ringing', 'active']);
const JOIN_TTL_SECONDS = 4 * 60 * 60;
// How long a call may ring before it reads as missed, same order of magnitude as a phone ring.
const RING_TTL_SECONDS = 45;
const HISTORY_PAGE_SIZE = 50;
const OK = { ok: true } as const;

const isLive = (call: CallRecord) => LIVE_STATUSES.has(call.status);

type HistoryCursor = { startedAt: string; id: string };

function decodeHistoryCursor(value: string): HistoryCursor {
  try {
    const cursor = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as HistoryCursor;
    if (!Number.isFinite(Date.parse(cursor.startedAt)) || !/^[0-9a-f-]{36}$/i.test(cursor.id))
      throw new Error();
    return cursor;
  } catch {
    throw new ConflictException('Invalid calls cursor');
  }
}

function encodeHistoryCursor(cursor: HistoryCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}

@Injectable()
export class CallsService {
  constructor(
    private readonly calls: CallsRepository,
    private readonly channelAccess: ChannelAccessFacade,
    private readonly entries: EntriesFacade,
    private readonly provider: CallProvider,
    private readonly realtime: RealtimePublisher,
    private readonly events: EventPublisher,
    private readonly outbox: EventOutbox,
  ) {}

  async start(member: WorkspaceMember, channelId: string, accessToken: string) {
    if (!this.provider.isConfigured) {
      throw new ServiceUnavailableException('Calls are not configured');
    }

    const channel = await this.channelAccess.requirePostAccess(member, channelId);
    await this.expireStale(member, channel, accessToken);

    // A channel holds one live call: calling into it joins that one instead of ringing again.
    const ongoing = await this.calls.findActive(channelId);
    if (ongoing) return this.toView(ongoing);

    const { call, entry } = await this.placeCall(member, channel, accessToken);
    await this.ring(member, channel, call, entry);

    return this.toView(call);
  }

  async active(member: WorkspaceMember, channelId: string, accessToken: string) {
    const { channel } = await this.channelAccess.requireReadAccess(member, channelId);
    await this.expireStale(member, channel, accessToken);

    const call = await this.calls.findActive(channelId);
    return call ? this.toView(call) : null;
  }

  async list(member: WorkspaceMember, filter: CallHistoryFilter, before?: string) {
    const cursor = before ? decodeHistoryCursor(before) : undefined;
    const rows = await this.calls.listForMember(
      member.workspaceId,
      member.id,
      filter,
      cursor ? { startedAt: new Date(cursor.startedAt), id: cursor.id } : undefined,
      HISTORY_PAGE_SIZE,
    );

    const page = rows.slice(0, HISTORY_PAGE_SIZE);
    const last = page.at(-1);
    const hasMore = rows.length > HISTORY_PAGE_SIZE && last;

    return {
      items: page.map((row) => this.toHistoryView(row)),
      nextCursor: hasMore
        ? encodeHistoryCursor({ startedAt: last.startedAt.toISOString(), id: last.id })
        : null,
    };
  }

  async join(member: WorkspaceMember, channelId: string, callId: string, accessToken: string) {
    const { channel, call } = await this.own(member, channelId, callId);

    // Nobody may have polled since the ring ran out, so answering must not revive it.
    const missed = await this.expireStale(member, channel, accessToken);
    const rangOut = missed?.id === call.id;
    if (!isLive(call) || rangOut) throw new ForbiddenException('Call is no longer available');

    const answersRing = call.status === 'ringing' && member.id !== call.startedByMemberId;
    if (answersRing) {
      const activated = await this.calls.activate(call.id);
      if (activated) await this.notify(member, channel, activated, 'call:accepted');
    }

    const grant = await this.provider.mintJoinToken(
      call,
      {
        identity: member.profile.oidcUserId,
        name: member.profile.displayName ?? member.id,
        ttlSeconds: JOIN_TTL_SECONDS,
      },
      accessToken,
    );

    // The call's own start, not this join, so a reconnect renders the same elapsed time.
    return { callId: call.id, roomName: call.roomName, startedAt: call.startedAt, ...grant };
  }

  // Only a DM decline ends the call; in a channel others may still answer, so it stays local.
  async decline(member: WorkspaceMember, channelId: string, callId: string, accessToken: string) {
    const { channel } = await this.own(member, channelId, callId);
    if (channel.kind !== 'dm') return OK;

    const declined = await this.calls.decline(callId);
    if (declined) await this.close(member, channel, declined, 'call:declined', accessToken);

    return OK;
  }

  // A DM ends when either side leaves; a channel call only once its room is confirmed empty.
  async leave(member: WorkspaceMember, channelId: string, callId: string, accessToken: string) {
    const { channel, call } = await this.own(member, channelId, callId);
    if (!isLive(call)) return OK;

    if (channel.kind !== 'dm') {
      const remaining = await this.provider.countParticipants(call, accessToken);
      if (remaining > 0) return OK;
    }

    const ended = await this.calls.end(callId);
    if (ended) await this.close(member, channel, ended, 'call:ended', accessToken);

    return OK;
  }

  /** The call, its timeline entry and its media room commit or roll back together. */
  @Transactional()
  private async placeCall(
    member: WorkspaceMember,
    channel: ChannelAccessSnapshot,
    accessToken: string,
  ) {
    const id = randomUUID();
    const call = await this.calls.insert({
      id,
      workspaceId: member.workspaceId,
      channelId: channel.id,
      roomName: `call-${id}`,
      startedByMemberId: member.id,
    });

    const entry = await this.entries.appendCall(member.workspaceId, channel.id, call.id);

    const pushRecipients = await this.calls.ringRecipients(channel.id, member.id);
    await this.outbox.record(
      CALL_SIGNAL_EVENT,
      new CallSignalEvent(
        'call:incoming',
        this.signalPayload(member, channel, call),
        pushRecipients,
      ),
      { expireInSeconds: RING_TTL_SECONDS, priority: 1 },
    );

    // Last, so a refusal here rolls back the call and its push before anyone is rung.
    const participantIds = await this.calls.ringRecipients(channel.id, null);
    await this.provider.create(call, { participantIds, group: channel.kind !== 'dm' }, accessToken);

    return { call, entry };
  }

  private async ring(
    member: WorkspaceMember,
    channel: ChannelAccessSnapshot,
    call: CallRecord,
    entry: ChannelEntry,
  ) {
    this.events.publish(
      CALL_ENTRY_CREATED_EVENT,
      new CallEntryCreatedEvent(
        member.workspaceId,
        channel.id,
        call.id,
        entry.seq.toString(),
        member.id,
      ),
    );

    // The caller must not get their own incoming-call card and ringtone.
    await this.notify(member, channel, call, 'call:incoming', { includeActor: false });
  }

  // Our state is already settled, so closing the media room comes last.
  private async close(
    actor: WorkspaceMember,
    channel: ChannelAccessSnapshot,
    call: CallRecord,
    event: 'call:declined' | 'call:ended' | 'call:missed',
    accessToken: string,
  ) {
    await this.notify(actor, channel, call, event);
    await this.provider.end(call, accessToken);
  }

  private async expireStale(
    actor: WorkspaceMember,
    channel: ChannelAccessSnapshot,
    accessToken: string,
  ) {
    const ringDeadline = new Date(Date.now() - RING_TTL_SECONDS * 1000);
    const missed = await this.calls.sweepStale(channel.id, ringDeadline);

    if (missed) await this.close(actor, channel, missed, 'call:missed', accessToken);

    return missed;
  }

  // Post access, not read: a non-member reader of a public channel must not get a media credential.
  private async own(member: WorkspaceMember, channelId: string, callId: string) {
    const channel = await this.channelAccess.requirePostAccess(member, channelId);

    const call = await this.calls.findOwn({ workspaceId: member.workspaceId, channelId, callId });
    if (!call) throw new NotFoundException('Call not found');

    return { channel, call };
  }

  // Includes the actor by default: their own client refreshes cached call state from these too.
  private async notify(
    actor: WorkspaceMember,
    channel: ChannelAccessSnapshot,
    call: CallRecord,
    event: CallSignalKind,
    options?: { includeActor?: boolean },
  ): Promise<void> {
    const includeActor = options?.includeActor ?? true;
    const recipients = await this.calls.ringRecipients(channel.id, includeActor ? null : actor.id);

    const payload = this.signalPayload(actor, channel, call);

    for (const oidcUserId of recipients) {
      this.realtime.toUser(oidcUserId, event, payload);
    }
    this.events.publish(CALL_SIGNAL_EVENT, new CallSignalEvent(event, payload, recipients));
  }

  private signalPayload(actor: WorkspaceMember, channel: ChannelAccessSnapshot, call: CallRecord) {
    return {
      workspaceId: channel.workspaceId,
      channelId: channel.id,
      channelKind: channel.kind,
      callId: call.id,
      roomName: call.roomName,
      startedByMemberId: actor.id,
      startedByDisplayName: actor.profile.displayName,
      startedByAvatarPath: actor.profile.avatarPath,
    };
  }

  private toView(call: CallRecord) {
    return {
      id: call.id,
      channelId: call.channelId,
      status: call.status,
      startedByMemberId: call.startedByMemberId,
      startedAt: call.startedAt,
      endedAt: call.endedAt,
    };
  }

  private toHistoryView(row: Awaited<ReturnType<CallsRepository['listForMember']>>[number]) {
    return { ...this.toView(row), participant: row.participant };
  }
}
