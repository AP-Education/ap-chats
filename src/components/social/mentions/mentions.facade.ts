import { BadRequestException, Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { ChannelAccessFacade } from '@/components/communities/channel-access';
import type { ChannelAccessSnapshot } from '@/components/communities/channels/types/channel-access.types';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { MentionsRepository } from './repository/mentions.repository';
import type { MentionedMessage, MentionTargets } from './types';

@Injectable()
export class MentionsFacade {
  constructor(
    private readonly repository: MentionsRepository,
    private readonly access: ChannelAccessFacade,
  ) {}

  mentionedMemberIds(messageIds: string[]): Promise<string[]> {
    return this.repository.mentionedMemberIds(messageIds);
  }

  @Transactional()
  async candidates(member: WorkspaceMember, channelId: string, query: string) {
    const { isMember } = await this.access.requireReadAccess(member, channelId);
    if (!isMember) return [];
    return this.repository.candidates(member.workspaceId, channelId, query.slice(0, 80));
  }

  async requireValid(channel: ChannelAccessSnapshot, targets: MentionTargets): Promise<void> {
    if (targets.everyone && channel.kind === 'dm')
      throw new BadRequestException('Everyone can only be mentioned in a channel');

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

    if (targets.everyone) await this.repository.addEveryone(message);
  }

  removeForMessages(ids: string[]): Promise<void> {
    return this.repository.removeForMessages(ids);
  }
}
