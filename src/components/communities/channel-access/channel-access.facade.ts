import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { isAdministrator } from '@/components/workspaces/access';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import type { ChannelAccessSnapshot } from '../channels/types/channel-access.types';
import { ChannelAccessRepository } from './repository/channel-access.repository';

type ChannelLock = 'update' | 'key share';

@Injectable()
export class ChannelAccessFacade {
  constructor(private readonly repository: ChannelAccessRepository) {}

  async requirePostAccess(
    member: WorkspaceMember,
    channelId: string,
  ): Promise<ChannelAccessSnapshot> {
    const channel = await this.requireParticipation(member, channelId, 'update');
    await this.requireReachablePeer(member, channel);
    if (!channel.canPost) throw new ForbiddenException('You can only read this channel');

    return channel;
  }

  /** No channel lock: changes outside history (reactions) never queue behind messages being sent. */
  async requireParticipant(
    member: WorkspaceMember,
    channelId: string,
  ): Promise<ChannelAccessSnapshot> {
    const channel = await this.requireParticipation(member, channelId);
    await this.requireReachablePeer(member, channel);

    return channel;
  }

  requireReadAccess(member: WorkspaceMember, channelId: string): Promise<ChannelAccessSnapshot> {
    return this.requireParticipation(member, channelId, 'key share');
  }

  /**
   * For callers that only read. Takes no row locks, so the transaction stays read-only and
   * commits without a WAL flush; the member guard has already confirmed the member is active.
   */
  async requireViewAccess(
    member: WorkspaceMember,
    channelId: string,
  ): Promise<ChannelAccessSnapshot> {
    const channel = await this.repository.findParticipation(
      member.workspaceId,
      channelId,
      member.id,
    );
    if (!channel) throw new NotFoundException('Channel not found');

    return channel;
  }

  async requireForwardAccess(
    member: WorkspaceMember,
    sourceChannelId: string,
    targetChannelId: string,
  ): Promise<ChannelAccessSnapshot> {
    // Lock in id order so two forwards between the same channels never deadlock.
    const locked = new Map<string, ChannelAccessSnapshot | undefined>();
    for (const id of [...new Set([sourceChannelId, targetChannelId])].sort())
      locked.set(
        id,
        await this.repository.findParticipation(member.workspaceId, id, member.id, 'update'),
      );
    await this.requireActiveMember(member);

    const source = locked.get(sourceChannelId);
    const target = locked.get(targetChannelId);
    if (!source || !target) throw new NotFoundException('Channel not found');

    await this.requireReachablePeer(member, target);
    if (!target.canPost) throw new ForbiddenException('You can only read the destination channel');

    return target;
  }

  /** Channel managers and workspace managers keep order in a channel; a DM has no managers. */
  manages(member: WorkspaceMember, channel: ChannelAccessSnapshot): boolean {
    return channel.kind !== 'dm' && (channel.canManage || isAdministrator(member));
  }

  requireManager(member: WorkspaceMember, channel: ChannelAccessSnapshot): void {
    if (channel.kind === 'dm')
      throw new ForbiddenException('Direct messages have no channel manager');
    if (!this.manages(member, channel))
      throw new ForbiddenException('Only the channel managers can do this');
  }

  private async requireParticipation(
    member: WorkspaceMember,
    channelId: string,
    lock?: ChannelLock,
  ): Promise<ChannelAccessSnapshot> {
    const channel = await this.repository.findParticipation(
      member.workspaceId,
      channelId,
      member.id,
      lock,
    );
    if (!channel) throw new NotFoundException('Channel not found');

    await this.requireActiveMember(member);

    return channel;
  }

  private async requireReachablePeer(
    member: WorkspaceMember,
    channel: ChannelAccessSnapshot,
  ): Promise<void> {
    if (channel.kind !== 'dm') return;

    const isPeerActive = await this.repository.isDmPeerActive(channel.id, member.id);
    if (!isPeerActive) throw new ForbiddenException('Direct message participant is unavailable');
  }

  private async requireActiveMember(member: WorkspaceMember): Promise<void> {
    const isActive = await this.repository.isActiveWorkspaceMember(member.workspaceId, member.id);
    if (!isActive) throw new ForbiddenException('Not a member of this workspace');
  }
}
