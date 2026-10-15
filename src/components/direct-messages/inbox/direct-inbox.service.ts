import { Injectable, NotFoundException } from '@nestjs/common';

import { conversationView } from './conversation-view';
import { decodeInboxCursor, encodeInboxCursor } from './inbox-cursor';
import { DirectInboxRepository } from './repository/direct-inbox.repository';

const PAGE_SIZE = 50;
const UNREAD_SHOWN = 5;

@Injectable()
export class DirectInboxService {
  constructor(private readonly repository: DirectInboxRepository) {}

  async get(userId: string, channelId: string) {
    return this.view(await this.repository.memberIdsOf(userId), channelId);
  }

  async view(viewerIds: string[], channelId: string) {
    const row = await this.repository.find(viewerIds, channelId);
    if (!row) throw new NotFoundException('Direct message not found');

    return conversationView(row);
  }

  async list(userId: string, before?: string) {
    const cursor = before ? decodeInboxCursor(before) : undefined;
    const viewerIds = await this.repository.memberIdsOf(userId);
    const rows = await this.repository.page(viewerIds, cursor, PAGE_SIZE + 1);

    const page = rows.slice(0, PAGE_SIZE);
    const last = page.at(-1);
    const hasMore = rows.length > PAGE_SIZE && last !== undefined;

    return {
      items: page.map(conversationView),
      nextCursor: hasMore
        ? encodeInboxCursor({ at: last.channel.updatedAt, id: last.channel.id })
        : null,
    };
  }

  async unread(userId: string) {
    const viewerIds = await this.repository.memberIdsOf(userId);
    const unread = await this.repository.unread(viewerIds, UNREAD_SHOWN);

    return unread.map(({ row, unreadCount }) => ({ ...conversationView(row), unreadCount }));
  }
}
