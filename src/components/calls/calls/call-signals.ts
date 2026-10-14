import { Injectable } from '@nestjs/common';

import type { ChannelAccessSnapshot } from '@/components/communities/channel-access/channel-access/types';
import type { WorkspaceMember } from '@/components/workspaces/members/types';
import { EventPublisher } from '@/globals/publisher';

import {
  CALL_SIGNAL_EVENT,
  CallSignalEvent,
  type CallSignalKind,
  type CallSignalPayload,
} from './events/call-signal.event';
import { CallsRepository } from './repository/calls.repository';
import type { CallRecord } from './types';

export function callSignalPayload(
  actor: WorkspaceMember,
  channel: ChannelAccessSnapshot,
  call: CallRecord,
): CallSignalPayload {
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

@Injectable()
export class CallSignals {
  constructor(
    private readonly calls: CallsRepository,
    private readonly events: EventPublisher,
  ) {}

  // Includes the actor by default: their own client refreshes cached call state from these too.
  async notify(
    actor: WorkspaceMember,
    channel: ChannelAccessSnapshot,
    call: CallRecord,
    kind: CallSignalKind,
    options: { includeActor?: boolean } = {},
  ): Promise<void> {
    const includeActor = options.includeActor ?? true;
    const recipients = await this.calls.ringRecipients(channel.id, includeActor ? [] : [actor.id]);

    const payload = callSignalPayload(actor, channel, call);
    this.events.publish(CALL_SIGNAL_EVENT, new CallSignalEvent(kind, payload, recipients));
  }

  notifyOwnDevices(
    actor: WorkspaceMember,
    channel: ChannelAccessSnapshot,
    call: CallRecord,
    kind: CallSignalKind,
  ): void {
    const payload = callSignalPayload(actor, channel, call);
    const recipients = [actor.profile.oidcUserId];
    this.events.publish(CALL_SIGNAL_EVENT, new CallSignalEvent(kind, payload, recipients));
  }
}
