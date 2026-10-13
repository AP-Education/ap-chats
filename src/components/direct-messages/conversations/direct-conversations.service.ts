import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { NotificationSettingsService } from '@/components/notifications/preferences';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { DirectInboxService } from '../inbox';
import { DirectConversationsRepository } from './repository/direct-conversations.repository';
import type { MemberPair, MuteMode } from './types';

@Injectable()
export class DirectConversationsService {
  constructor(
    private readonly repository: DirectConversationsRepository,
    private readonly inbox: DirectInboxService,
    private readonly settings: NotificationSettingsService,
  ) {}

  // An existing conversation in any workspace the two share wins over a new one here.
  async open(member: WorkspaceMember, targetMemberId: string) {
    const sharedId = await this.repository.findShared(member, targetMemberId);
    if (!sharedId) return this.findOrCreate(member, targetMemberId);

    return this.inbox.get(member.profile.oidcUserId, sharedId);
  }

  // Joins the caller's transaction, so a forward that opens a DM commits or fails as one.
  @Transactional()
  async findOrCreate(member: WorkspaceMember, targetMemberId: string) {
    if (member.id === targetMemberId)
      throw new ConflictException('Choose another workspace member');

    const isTargetActive = await this.repository.isActiveMember(member.workspaceId, targetMemberId);
    if (!isTargetActive) throw new NotFoundException('Workspace member not found');

    const pair = this.pairOf(member, targetMemberId);
    await this.repository.lockPair(pair);
    const channelId =
      (await this.repository.findPair(pair)) ?? (await this.repository.createPair(pair, member.id));

    return this.inbox.view([member.id], channelId);
  }

  async mute(member: WorkspaceMember, channelId: string, mode: MuteMode) {
    await this.inbox.view([member.id], channelId);

    const command =
      mode === 'unmute' ? { type: 'unmute' as const } : { type: 'mute' as const, duration: mode };
    await this.settings.change(member, channelId, command);

    return this.inbox.view([member.id], channelId);
  }

  private pairOf(member: WorkspaceMember, targetMemberId: string): MemberPair {
    const [firstMemberId, secondMemberId] = [member.id, targetMemberId].sort() as [string, string];
    return { workspaceId: member.workspaceId, firstMemberId, secondMemberId };
  }
}
