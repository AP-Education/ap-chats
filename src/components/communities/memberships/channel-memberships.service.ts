import { Injectable } from '@nestjs/common';

import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { ChannelVisibility } from '../channel-access/visibility';
import { ChannelMembershipsRepository } from './repository';
import type { ChannelMembership } from './types';

@Injectable()
export class ChannelMembershipsService {
  constructor(
    private readonly memberships: ChannelMembershipsRepository,
    private readonly visibility: ChannelVisibility,
  ) {}

  async list(member: WorkspaceMember, channelId: string): Promise<ChannelMembership[]> {
    await this.visibility.requireVisible(member, channelId);

    return this.memberships.findAllActiveForChannel(channelId);
  }
}
