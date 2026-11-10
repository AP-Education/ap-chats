import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { ChannelAccessPolicy } from '@/components/communities/channel-access/channel-access';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { AttachmentLinksService } from '../attachments';
import { ReadStateService } from '../read-state';
import type { HistoryQueryDto, HistoryWindowQueryDto } from './dto/history-query.dto';
import { historyItemView, historyPageView } from './history.view';
import { HistoryRepository } from './repository/history.repository';
import type { HistoryRow, ShownHistoryRow } from './types/history.types';

const PAGE_SIZE = 40;
const CONTEXT_BEFORE_TARGET = 12;

@Injectable()
export class HistoryService {
  constructor(
    private readonly access: ChannelAccessPolicy,
    private readonly history: HistoryRepository,
    private readonly readState: ReadStateService,
    private readonly links: AttachmentLinksService,
  ) {}

  @Transactional()
  async entry(member: WorkspaceMember, channelId: string, entryId: string) {
    const channel = await this.access.requireViewAccess(member, channelId);

    const seq = await this.history.entrySeq(channelId, entryId, member.id);
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
    const matches = row && (row.type === 'MESSAGE' ? row.message.id : row.call.id) === entryId;
    if (!matches) throw new NotFoundException('Entry not found');

    const shown = await this.shown(row);
    return historyItemView(shown, member.id);
  }

  /** Opens history at the first unread entry or at a linked message; otherwise at the newest. */
  @Transactional()
  async window(member: WorkspaceMember, channelId: string, query: HistoryWindowQueryDto) {
    const channel = await this.access.requireViewAccess(member, channelId);
    const snapshotSeq = channel.lastEntrySeq;
    const position = await this.readState.position(channel, member.id, snapshotSeq);

    const target = query.messageId
      ? await this.requireMessageSeq(channelId, query.messageId, member.id)
      : position.firstUnreadSeq;
    const snapshot = { channelId, viewerMemberId: member.id, ceiling: snapshotSeq };
    const view = { viewerMemberId: member.id, snapshotSeq, position };

    if (target === null) {
      const latest = await this.history.page({
        ...snapshot,
        direction: 'before',
        limit: PAGE_SIZE,
      });
      const rows = await this.shownAll(latest.rows);
      return historyPageView({
        ...view,
        rows,
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
    const rows = await this.shownAll([...older.rows, ...newer.rows]);
    return historyPageView({
      ...view,
      rows,
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
    const rows = await this.shownAll(page.rows);

    return historyPageView({
      rows,
      viewerMemberId: member.id,
      snapshotSeq: ceiling,
      position,
      hasOlder: direction === 'before' ? page.hasMore : startsMidHistory,
      hasNewer: direction === 'after' ? page.hasMore : startsMidHistory,
    });
  }

  private shownAll(rows: HistoryRow[]): Promise<ShownHistoryRow[]> {
    return Promise.all(rows.map((row) => this.shown(row)));
  }

  // A photo shows at once by the links its row brings; any other file is signed once opened.
  private async shown(row: HistoryRow): Promise<ShownHistoryRow> {
    if (row.type === 'CALL') return row;

    const { message } = row;
    const attachments = await this.links.shown(message.workspaceId, message.attachments);
    return { ...row, message: { ...message, attachments } };
  }

  private async requireMessageSeq(
    channelId: string,
    messageId: string,
    viewerMemberId: string,
  ): Promise<bigint> {
    const seq = await this.history.messageSeq(channelId, messageId, viewerMemberId);
    if (seq === null) throw new NotFoundException('Message not found');
    return seq;
  }
}
