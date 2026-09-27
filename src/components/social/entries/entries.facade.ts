import { Injectable } from '@nestjs/common';

import { EntriesRepository } from './repository/entries.repository';

@Injectable()
export class EntriesFacade {
  constructor(private readonly entries: EntriesRepository) {}

  append(workspaceId: string, channelId: string, messageId: string) {
    return this.entries.append(workspaceId, channelId, messageId);
  }

  appendMany(workspaceId: string, channelId: string, messageIds: string[]) {
    return this.entries.appendMany(workspaceId, channelId, messageIds);
  }
}
