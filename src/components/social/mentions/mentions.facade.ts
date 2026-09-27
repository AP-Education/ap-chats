import { BadRequestException, Injectable } from '@nestjs/common';

import { MentionsRepository } from './repository/mentions.repository';

@Injectable()
export class MentionsFacade {
  constructor(private readonly repository: MentionsRepository) {}

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
