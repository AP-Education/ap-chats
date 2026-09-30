import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { ChannelAccessFacade } from '@/components/communities/channel-access/channel-access.facade';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { messageView } from '../messages/message-view';
import { ReadStateFacade } from '../read-state/read-state.facade';
import type { HistoryQueryDto, HistoryWindowQueryDto } from './dto/history-query.dto';
import { HistoryRepository } from './repository/history.repository';
import type { HistoryRow } from './types/history.types';

@Injectable()
export class HistoryFacade {
  constructor(
    private readonly access: ChannelAccessFacade,
    private readonly history: HistoryRepository,
    private readonly readState: ReadStateFacade,
  ) {}

  @Transactional()
  async entry(member: WorkspaceMember, channelId: string, entryId: string) {
    const { channel } = await this.access.requireReadAccess(member, channelId);
    const seq = await this.history.entrySeq(channelId, entryId);
    if (seq === null) throw new NotFoundException('Entry not found');
    const page = await this.history.page(channelId, 'after', seq - 1n, channel.lastEntrySeq, 1);
    const row = page.rows[0];
    if (!row) throw new NotFoundException('Entry not found');
    return this.item(row, member.id);
  }

  @Transactional()
  async window(member: WorkspaceMember, channelId: string, query: HistoryWindowQueryDto) {
    const { channel, isMember } = await this.access.requireReadAccess(member, channelId);
    const snapshotSeq = channel.lastEntrySeq;
    const readState = isMember
      ? await this.readState.state(channelId, member.id, snapshotSeq)
      : null;
    const lastRead = BigInt(readState?.lastReadEntrySeq ?? '0');
    const firstUnread = isMember
      ? await this.history.firstUnreadSeq(channelId, member.id, lastRead, snapshotSeq)
      : null;
    const target = query.messageId
      ? await this.history.messageSeq(channelId, query.messageId)
      : firstUnread;
    if (query.messageId && target === null) throw new NotFoundException('Message not found');

    if (target === null) {
      const latest = await this.history.page(channelId, 'before', undefined, snapshotSeq, 40);
      const items = latest.rows.map((row) => this.item(row, member.id));
      return {
        items,
        snapshotSeq: snapshotSeq.toString(),
        firstUnreadSeq: null,
        unreadCount: readState?.unreadCount ?? 0,
        hasOlder: latest.hasMore,
        olderCursor: latest.hasMore ? (items[0]?.seq ?? null) : null,
        hasNewer: false,
        newerCursor: null,
        readState,
      };
    }

    const [older, newer] = await Promise.all([
      this.history.page(channelId, 'before', target, snapshotSeq, 12),
      this.history.page(channelId, 'after', target - 1n, snapshotSeq, 40),
    ]);
    const items = [...older.rows, ...newer.rows].map((row) => this.item(row, member.id));
    return {
      items,
      snapshotSeq: snapshotSeq.toString(),
      firstUnreadSeq: firstUnread?.toString() ?? null,
      unreadCount: readState?.unreadCount ?? 0,
      hasOlder: older.hasMore,
      olderCursor: older.hasMore ? (items[0]?.seq ?? null) : null,
      hasNewer: newer.hasMore,
      newerCursor: newer.hasMore ? (items.at(-1)?.seq ?? null) : null,
      readState,
    };
  }

  @Transactional()
  async page(member: WorkspaceMember, channelId: string, query: HistoryQueryDto) {
    if (query.before !== undefined && query.after !== undefined)
      throw new BadRequestException('Use either before or after');

    const { channel, isMember } = await this.access.requireReadAccess(member, channelId);
    const direction = query.after === undefined ? 'before' : 'after';
    const cursorText = query.before ?? query.after;
    const cursor = cursorText === undefined ? undefined : BigInt(cursorText);
    const ceiling = query.snapshot === undefined ? channel.lastEntrySeq : BigInt(query.snapshot);
    if (ceiling > channel.lastEntrySeq)
      throw new BadRequestException('Snapshot exceeds channel history');
    const page = await this.history.page(channelId, direction, cursor, ceiling, query.limit ?? 40);
    const readState = isMember ? await this.readState.state(channelId, member.id, ceiling) : null;
    const firstUnread = readState
      ? await this.history.firstUnreadSeq(
          channelId,
          member.id,
          BigInt(readState.lastReadEntrySeq),
          ceiling,
        )
      : null;
    const items = page.rows.map((row) => this.item(row, member.id));
    const edge = direction === 'before' ? items[0] : items.at(-1);
    return {
      items,
      snapshotSeq: ceiling.toString(),
      firstUnreadSeq: firstUnread?.toString() ?? null,
      unreadCount: readState?.unreadCount ?? 0,
      hasOlder: direction === 'before' ? page.hasMore : Boolean(cursor),
      olderCursor:
        direction === 'before' && page.hasMore ? (edge?.seq ?? null) : (items[0]?.seq ?? null),
      hasNewer: direction === 'after' ? page.hasMore : Boolean(cursor),
      newerCursor:
        direction === 'after' && page.hasMore ? (edge?.seq ?? null) : (items.at(-1)?.seq ?? null),
      readState,
    };
  }

  private item(row: HistoryRow, viewerMemberId: string) {
    if (row.type === 'CALL') {
      const { seq, createdAt, call, startedByProfile } = row;
      return {
        type: 'CALL' as const,
        id: call.id,
        seq: seq.toString(),
        createdAt,
        call: {
          id: call.id,
          status: call.status,
          startedByMemberId: call.startedByMemberId,
          startedAt: call.startedAt,
          endedAt: call.endedAt,
        },
        startedBy: {
          memberId: call.startedByMemberId,
          displayName: startedByProfile.displayName,
          avatarPath: startedByProfile.avatarPath,
        },
      };
    }

    const {
      seq,
      createdAt,
      message,
      authorProfile,
      reply,
      replyAuthorProfile,
      forwardAuthorProfile,
      pin,
      mentions,
    } = row;
    return {
      type: 'MESSAGE' as const,
      id: message.id,
      seq: seq.toString(),
      createdAt,
      message: messageView(message, seq, viewerMemberId),
      author: {
        memberId: message.authorMemberId,
        displayName: authorProfile.displayName,
        avatarPath: authorProfile.avatarPath,
      },
      reply: reply
        ? {
            id: reply.id,
            authorMemberId: reply.authorMemberId,
            author: replyAuthorProfile
              ? {
                  memberId: reply.authorMemberId,
                  displayName: replyAuthorProfile.displayName,
                  avatarPath: replyAuthorProfile.avatarPath,
                }
              : null,
            markdown: reply.deletedAt ? null : reply.contentMarkdown,
          }
        : null,
      forwardedFrom:
        message.forwardedFromMemberId && forwardAuthorProfile
          ? {
              memberId: message.forwardedFromMemberId,
              displayName: forwardAuthorProfile.displayName,
              avatarPath: forwardAuthorProfile.avatarPath,
            }
          : null,
      pin: pin ? { pinnedAt: pin.pinnedAt, pinnedByMemberId: pin.pinnedByMemberId } : null,
      mentions,
    };
  }
}
