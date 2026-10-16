import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { ChannelAccessPolicy } from '@/components/communities/channel-access/channel-access';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { ReadStateService } from '../read-state';
import type { HistoryQueryDto, HistoryWindowQueryDto } from './dto/history-query.dto';
import { historyItemView, historyPageView } from './history.view';
import { HistoryRepository } from './repository/history.repository';

const PAGE_SIZE = 40;
const CONTEXT_BEFORE_TARGET = 12;

@Injectable()
export class HistoryService {
  constructor(
    private readonly access: ChannelAccessPolicy,
    private readonly history: HistoryRepository,
    private readonly readState: ReadStateService,
  ) {}

  @Transactional()
  async entry(member: WorkspaceMember, channelId: string, entryId: string) {
    const channel = await this.access.requireViewAccess(member, channelId);

    const seq = await this.history.entrySeq(channelId, entryId);
    if (seq === null) throw new NotFoundException('Entry not found');

    const { rows } = await this.history.page({
      channelId,
      viewerMemberId: member.id,
      direction: 'after',
      cursor: seq - 1n,
      ceiling: channel.lastEntrySeq,
      limit: 1,
    });
    const [row] = rows;
    if (!row) throw new NotFoundException('Entry not found');

    return historyItemView(row, member.id);
  }

  /** Opens history at the first unread entry or at a linked message; otherwise at the newest. */
  @Transactional()
  async window(member: WorkspaceMember, channelId: string, query: HistoryWindowQueryDto) {
    const channel = await this.access.requireViewAccess(member, channelId);
    const snapshotSeq = channel.lastEntrySeq;
    const position = await this.readState.position(channel, member.id, snapshotSeq);

    const target = query.messageId
      ? await this.requireMessageSeq(channelId, query.messageId)
      : position.firstUnreadSeq;
    const snapshot = { channelId, viewerMemberId: member.id, ceiling: snapshotSeq };
    const view = { viewerMemberId: member.id, snapshotSeq, position };

    if (target === null) {
      const latest = await this.history.page({
        ...snapshot,
        direction: 'before',
        limit: PAGE_SIZE,
      });
      return historyPageView({
        ...view,
        rows: latest.rows,
        hasOlder: latest.hasMore,
        hasNewer: false,
      });
    }

    const [older, newer] = await Promise.all([
      this.history.page({
        ...snapshot,
        direction: 'before',
        cursor: target,
        limit: CONTEXT_BEFORE_TARGET,
      }),
      this.history.page({ ...snapshot, direction: 'after', cursor: target - 1n, limit: PAGE_SIZE }),
    ]);
    return historyPageView({
      ...view,
      rows: [...older.rows, ...newer.rows],
      hasOlder: older.hasMore,
      hasNewer: newer.hasMore,
    });
  }

  @Transactional()
  async page(member: WorkspaceMember, channelId: string, query: HistoryQueryDto) {
    if (query.before !== undefined && query.after !== undefined)
      throw new BadRequestException('Use either before or after');

    const channel = await this.access.requireViewAccess(member, channelId);
    const ceiling = query.snapshot === undefined ? channel.lastEntrySeq : BigInt(query.snapshot);
    if (ceiling > channel.lastEntrySeq)
      throw new BadRequestException('Snapshot exceeds channel history');

    const direction = query.after === undefined ? 'before' : 'after';
    const cursorText = query.before ?? query.after;
    const cursor = cursorText === undefined ? undefined : BigInt(cursorText);
    const page = await this.history.page({
      channelId,
      viewerMemberId: member.id,
      direction,
      cursor,
      ceiling,
      limit: query.limit ?? PAGE_SIZE,
    });

    const position = await this.readState.position(channel, member.id, ceiling);
    const startsMidHistory = Boolean(cursor);

    return historyPageView({
      rows: page.rows,
      viewerMemberId: member.id,
      snapshotSeq: ceiling,
      position,
      hasOlder: direction === 'before' ? page.hasMore : startsMidHistory,
      hasNewer: direction === 'after' ? page.hasMore : startsMidHistory,
    });
  }

  private async requireMessageSeq(channelId: string, messageId: string): Promise<bigint> {
    const seq = await this.history.messageSeq(channelId, messageId);
    if (seq === null) throw new NotFoundException('Message not found');
    return seq;
  }
}
