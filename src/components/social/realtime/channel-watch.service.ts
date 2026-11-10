import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { ChannelAccessPolicy } from '@/components/communities/channel-access/channel-access';
import type { ChannelAccessSnapshot } from '@/components/communities/channel-access/channel-access/types';
import { WorkspaceMembersRepository } from '@/components/workspaces/members/repository';

/** Only a channel's own members follow it live; anyone else learns nothing, not even that it exists. */
@Injectable()
export class ChannelWatchService {
  constructor(
    private readonly members: WorkspaceMembersRepository,
    private readonly access: ChannelAccessPolicy,
  ) {}

  /** The channel as someone may follow it, or null when they may not. */
  @Transactional()
  async watchable(
    userId: string,
    workspaceId: string,
    channelId: string,
  ): Promise<ChannelAccessSnapshot | null> {
    const member = await this.members.findForUser(workspaceId, userId);
    if (!member) return null;

    try {
      return await this.access.requireViewAccess(member, channelId);
    } catch (error) {
      const isRefusal = error instanceof ForbiddenException || error instanceof NotFoundException;
      if (isRefusal) return null;
      throw error;
    }
  }
}
