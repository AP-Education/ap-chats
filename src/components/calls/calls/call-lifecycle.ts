import { Injectable, NotFoundException } from '@nestjs/common';

import type { ChannelAccessSnapshot } from '@/components/communities/channel-access/channel-access/types';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { CallSignals } from './call-signals';
import type { CallSignalKind } from './events/call-signal.event';
import { CallProvider } from './provider/call.provider';
import { CallsRepository } from './repository/calls.repository';
import type { CallRecord, CallStatus } from './types';

// How long a call may ring before it reads as missed, same order of magnitude as a phone ring.
export const RING_TTL_SECONDS = 45;

const LIVE_STATUSES = new Set<CallStatus>(['ringing', 'active']);

export const isLive = (call: CallRecord) => LIVE_STATUSES.has(call.status);

@Injectable()
export class CallLifecycle {
  constructor(
    private readonly calls: CallsRepository,
    private readonly signals: CallSignals,
    private readonly provider: CallProvider,
  ) {}

  live(channelId: string): Promise<CallRecord | undefined> {
    return this.calls.findActive(channelId);
  }

  async find(channel: ChannelAccessSnapshot, callId: string): Promise<CallRecord> {
    const ref = { workspaceId: channel.workspaceId, channelId: channel.id, callId };
    const call = await this.calls.findOwn(ref);
    if (!call) throw new NotFoundException('Call not found');

    return call;
  }

  async ringOut(
    actor: WorkspaceMember,
    channel: ChannelAccessSnapshot,
    accessToken: string,
  ): Promise<CallRecord | undefined> {
    const ringDeadline = new Date(Date.now() - RING_TTL_SECONDS * 1000);
    const missed = await this.calls.sweepStale(channel.id, ringDeadline);
    if (missed) await this.close(actor, channel, missed, 'call:missed', accessToken);

    return missed;
  }

  // The caller joining their own ringing call answers nobody.
  async answer(actor: WorkspaceMember, channel: ChannelAccessSnapshot, call: CallRecord) {
    const answersRing = call.status === 'ringing' && actor.id !== call.startedByMemberId;
    if (!answersRing) return;

    const activated = await this.calls.activate(call.id);
    if (activated) await this.signals.notify(actor, channel, activated, 'call:accepted');
  }

  // Only a DM decline ends the call; in a channel others may still answer, so it stays local.
  async decline(
    actor: WorkspaceMember,
    channel: ChannelAccessSnapshot,
    call: CallRecord,
    accessToken: string,
  ) {
    if (channel.kind !== 'dm') return;

    const declined = await this.calls.decline(call.id);
    if (declined) await this.close(actor, channel, declined, 'call:declined', accessToken);
  }

  // A DM ends when either side leaves; a channel call only once its room is confirmed empty.
  async hangUp(
    actor: WorkspaceMember,
    channel: ChannelAccessSnapshot,
    call: CallRecord,
    accessToken: string,
  ) {
    if (!isLive(call)) return;

    if (channel.kind !== 'dm') {
      const remaining = await this.provider.countParticipants(call, accessToken);
      if (remaining > 0) return;
    }

    const ended = await this.calls.end(call.id);
    if (ended) await this.close(actor, channel, ended, 'call:ended', accessToken);
  }

  // Our state is already settled, so the media room closes last.
  private async close(
    actor: WorkspaceMember,
    channel: ChannelAccessSnapshot,
    call: CallRecord,
    kind: CallSignalKind,
    accessToken: string,
  ) {
    await this.signals.notify(actor, channel, call, kind);
    await this.provider.end(call, accessToken);
  }
}
