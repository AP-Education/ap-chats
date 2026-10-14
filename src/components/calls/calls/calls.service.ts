import { ForbiddenException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { ChannelAccessPolicy } from '@/components/communities/channel-access/channel-access';
import type { WorkspaceMember } from '@/components/workspaces/members/types';
import { nothingToAnnounce } from '@/globals/publisher';

import { CallLifecycle, isLive } from './call-lifecycle';
import { CallPlacement } from './call-placement';
import { callView } from './call-view';
import { CallProvider } from './provider/call.provider';

const JOIN_TTL_SECONDS = 4 * 60 * 60;
const OK = { ok: true } as const;

@Injectable()
export class CallsService {
  constructor(
    private readonly access: ChannelAccessPolicy,
    private readonly lifecycle: CallLifecycle,
    private readonly placement: CallPlacement,
    private readonly provider: CallProvider,
  ) {}

  async start(member: WorkspaceMember, channelId: string, accessToken: string) {
    if (!this.provider.isConfigured)
      throw new ServiceUnavailableException('Calls are not configured');

    // Calls go with the right to post, so a read-only participant cannot ring the channel.
    const channel = await this.access.requirePostRight(member, channelId);
    await this.lifecycle.ringOut(member, channel, accessToken);

    const { call, announce } = await this.dial(member, channelId, accessToken);
    announce();

    return callView(call);
  }

  async active(member: WorkspaceMember, channelId: string, accessToken: string) {
    const channel = await this.access.requireViewAccess(member, channelId);
    await this.lifecycle.ringOut(member, channel, accessToken);

    const call = await this.lifecycle.live(channelId);
    return call ? callView(call) : null;
  }

  async join(member: WorkspaceMember, channelId: string, callId: string, accessToken: string) {
    const channel = await this.access.requirePostRight(member, channelId);
    const call = await this.lifecycle.find(channel, callId);

    // Nobody may have polled since the ring ran out, so answering must not revive it.
    const missed = await this.lifecycle.ringOut(member, channel, accessToken);
    const isAvailable = isLive(call) && missed?.id !== call.id;
    if (!isAvailable) throw new ForbiddenException('Call is no longer available');

    await this.lifecycle.answer(member, channel, call);
    const { answeredAt } = await this.lifecycle.find(channel, call.id);
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
    return {
      callId: call.id,
      roomName: call.roomName,
      startedAt: call.startedAt,
      answeredAt,
      ...grant,
    };
  }

  async decline(member: WorkspaceMember, channelId: string, callId: string, accessToken: string) {
    const { channel, call } = await this.own(member, channelId, callId);
    await this.lifecycle.decline(member, channel, call, accessToken);

    return OK;
  }

  async leave(member: WorkspaceMember, channelId: string, callId: string, accessToken: string) {
    const { channel, call } = await this.own(member, channelId, callId);
    await this.lifecycle.hangUp(member, channel, call, accessToken);

    return OK;
  }

  // The channel row lock makes two people dialling at once share one call instead of one failing.
  @Transactional()
  private async dial(member: WorkspaceMember, channelId: string, accessToken: string) {
    const channel = await this.access.requirePostAccess(member, channelId);

    const ongoing = await this.lifecycle.live(channelId);
    if (ongoing) return { call: ongoing, announce: nothingToAnnounce };

    return this.placement.place(member, channel, accessToken);
  }

  // Declining or leaving needs only participation; joining needs the right to post.
  private async own(member: WorkspaceMember, channelId: string, callId: string) {
    const channel = await this.access.requireParticipant(member, channelId);
    const call = await this.lifecycle.find(channel, callId);

    return { channel, call };
  }
}
