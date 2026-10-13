import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import type { ChannelAccessSnapshot } from '@/components/communities/channels/types/channel-access.types';
import { EntriesFacade } from '@/components/social/entries';
import type { WorkspaceMember } from '@/components/workspaces/members/types';
import { EventPublisher } from '@/globals/publisher';
import type { Announce } from '@/globals/publisher/types';

import { RING_TTL_SECONDS } from './call-lifecycle';
import { callSignalPayload } from './call-signals';
import { CALL_ENTRY_CREATED_EVENT, CallEntryCreatedEvent } from './events/call-entry-created.event';
import { CALL_SIGNAL_EVENT, CallSignalEvent } from './events/call-signal.event';
import { CallProvider } from './provider/call.provider';
import { CallsRepository } from './repository/calls.repository';
import type { CallRecord } from './types';

/** The call, its timeline entry, its ring and its media room commit or roll back together. */
@Injectable()
export class CallPlacement {
  constructor(
    private readonly calls: CallsRepository,
    private readonly entries: EntriesFacade,
    private readonly events: EventPublisher,
    private readonly provider: CallProvider,
  ) {}

  async place(
    caller: WorkspaceMember,
    channel: ChannelAccessSnapshot,
    accessToken: string,
  ): Promise<{ call: CallRecord; announce: Announce }> {
    const id = randomUUID();
    const call = await this.calls.insert({
      id,
      workspaceId: channel.workspaceId,
      channelId: channel.id,
      roomName: `call-${id}`,
      startedByMemberId: caller.id,
    });
    const entry = await this.entries.appendCall(channel.workspaceId, channel.id, call.id);

    const announceEntry = await this.events.record(
      CALL_ENTRY_CREATED_EVENT,
      new CallEntryCreatedEvent(
        channel.workspaceId,
        channel.id,
        call.id,
        entry.seq.toString(),
        caller.id,
      ),
    );
    // The caller must not get their own incoming-call card and ringtone.
    const rung = await this.calls.ringRecipients(channel.id, caller.id);
    const announceRing = await this.events.record(
      CALL_SIGNAL_EVENT,
      new CallSignalEvent('call:incoming', callSignalPayload(caller, channel, call), rung),
      { durable: true, expireInSeconds: RING_TTL_SECONDS, priority: 1 },
    );

    // Last, so a refusal here rolls back the call and its ring before anyone hears it.
    const participantIds = await this.calls.ringRecipients(channel.id, null);
    await this.provider.create(call, { participantIds, group: channel.kind !== 'dm' }, accessToken);

    return {
      call,
      announce: () => {
        announceEntry();
        announceRing();
      },
    };
  }
}
