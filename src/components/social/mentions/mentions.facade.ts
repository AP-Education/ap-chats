import { BadRequestException, Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { ChannelAccessFacade } from '@/components/communities/channel-access/channel-access.facade';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { MentionsRepository } from './repository/mentions.repository';

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

  async requireValid(workspaceId: string, channelId: string, ids: string[]): Promise<void> {
    if (!(await this.repository.allActiveInChannel(workspaceId, channelId, ids)))
      throw new BadRequestException('Mentioned member must be active in the channel');
  }

  replace(workspaceId: string, channelId: string, messageId: string, ids: string[]): Promise<void> {
    return this.repository.replace(workspaceId, channelId, messageId, ids);
  }

  removeForMessages(ids: string[]): Promise<void> {
    return this.repository.removeForMessages(ids);
  }
}
