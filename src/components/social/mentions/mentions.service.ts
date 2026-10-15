import { BadRequestException, Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { ChannelAccessPolicy } from '@/components/communities/channel-access/channel-access';
import type { ChannelAccessSnapshot } from '@/components/communities/channel-access/channel-access/types';
import type { WorkspaceMember } from '@/components/workspaces/members/types';
import { RolesFacade } from '@/components/workspaces/roles';

import { MentionsRepository } from './repository/mentions.repository';
import type { MentionedMessage, MentionTargets } from './types';

@Injectable()
export class MentionsService {
  constructor(
    private readonly repository: MentionsRepository,
    private readonly access: ChannelAccessPolicy,
    private readonly roles: RolesFacade,
  ) {}

  mentionedMemberIds(messageIds: string[]): Promise<string[]> {
    return this.repository.mentionedMemberIds(messageIds);
  }

  @Transactional()
  async candidates(member: WorkspaceMember, channelId: string, query: string) {
    await this.access.requireViewAccess(member, channelId);
    return this.repository.candidates(member.workspaceId, channelId, query.slice(0, 80));
  }

  async requireValid(channel: ChannelAccessSnapshot, targets: MentionTargets): Promise<void> {
    // TODO(everyone): anyone who may post notifies the whole channel or a role; decide who may.
    if (targets.everyone && channel.kind === 'dm')
      throw new BadRequestException('Everyone can only be mentioned in a channel');
    if (targets.roleIds.length && channel.kind === 'dm')
      throw new BadRequestException('Roles can only be mentioned in a channel');
    if (!(await this.roles.allInWorkspace(channel.workspaceId, targets.roleIds)))
      throw new BadRequestException('Mentioned role must exist in the workspace');

    const membersActive = await this.repository.allActiveInChannel(
      channel.workspaceId,
      channel.id,
      targets.memberIds,
    );
    if (!membersActive)
      throw new BadRequestException('Mentioned member must be active in the channel');
  }

  async replace(message: MentionedMessage, targets: MentionTargets): Promise<void> {
    await this.repository.replaceDirect(message, targets.memberIds);

    await this.repository.addRoles(message, targets.roleIds);
    if (targets.everyone) await this.repository.addEveryone(message);
  }

  removeForMessages(ids: string[]): Promise<void> {
    return this.repository.removeForMessages(ids);
  }
}
