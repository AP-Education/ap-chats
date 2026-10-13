import { Injectable } from '@nestjs/common';

import { callView } from '../calls/call-view';
import type { CallsHistoryQueryDto } from './dto/calls-history-query.dto';
import { decodeHistoryCursor, encodeHistoryCursor } from './history-cursor';
import { CallsHistoryRepository } from './repository/calls-history.repository';

const PAGE_SIZE = 50;

@Injectable()
export class CallsHistoryService {
  constructor(private readonly history: CallsHistoryRepository) {}

  async list(userId: string, query: CallsHistoryQueryDto) {
    const cursor = query.before ? decodeHistoryCursor(query.before) : undefined;
    const rows = await this.history.listForUser(userId, query.filter, cursor, PAGE_SIZE);

    const page = rows.slice(0, PAGE_SIZE);
    const last = page.at(-1);
    const hasMore = rows.length > PAGE_SIZE && last !== undefined;

    return {
      items: page.map((row) => ({
        ...callView(row),
        workspaceId: row.workspaceId,
        participant: row.participant,
      })),
      nextCursor: hasMore ? encodeHistoryCursor(last) : null,
    };
  }
}
