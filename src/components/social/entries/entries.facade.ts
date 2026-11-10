import { Injectable } from '@nestjs/common';

import { EntriesRepository } from './repository/entries.repository';

@Injectable()
export class EntriesFacade {
  constructor(private readonly entries: EntriesRepository) {}

  append(workspaceId: string, channelId: string, messageId: string, privateEntry = false) {
    return this.entries.append(workspaceId, channelId, messageId, privateEntry);
  }

  moveToEnd(workspaceId: string, channelId: string, messageId: string) {
    return this.entries.moveToEnd(workspaceId, channelId, messageId);
  }

  appendMany(workspaceId: string, channelId: string, messageIds: string[]) {
    return this.entries.appendMany(workspaceId, channelId, messageIds);
  }

  appendCall(workspaceId: string, channelId: string, callId: string) {
    return this.entries.appendCall(workspaceId, channelId, callId);
  }
}
