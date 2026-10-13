import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { ChannelAccessFacade } from '@/components/communities/channel-access';
import { WorkspaceMembersRepository } from '@/components/workspaces/members/repository';

/** Only a channel's own members follow it live; anyone else learns nothing, not even that it exists. */
@Injectable()
export class ChannelWatchService {
  constructor(
    private readonly members: WorkspaceMembersRepository,
    private readonly access: ChannelAccessFacade,
  ) {}

  @Transactional()
  async mayWatch(userId: string, workspaceId: string, channelId: string): Promise<boolean> {
    const member = await this.members.findForUser(workspaceId, userId);
    if (!member) return false;

    try {
      const { isMember } = await this.access.requireReadAccess(member, channelId);
      return isMember;
    } catch (error) {
      const isRefusal = error instanceof ForbiddenException || error instanceof NotFoundException;
      if (isRefusal) return false;
      throw error;
    }
  }
}
