import { BadRequestException, Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { ChannelAccessFacade } from '@/components/communities/channel-access/channel-access.facade';
import type { WorkspaceMember } from '@/components/workspaces/members/types';

import { messageView } from '../messages/message-view';
import { ReadStateFacade } from '../read-state/read-state.facade';
import type { HistoryQueryDto } from './dto/history-query.dto';
import { HistoryRepository } from './repository/history.repository';

@Injectable()
export class HistoryFacade {
  constructor(
    private readonly access: ChannelAccessFacade,
    private readonly history: HistoryRepository,
    private readonly readState: ReadStateFacade,
  ) {}

  @Transactional()
  async page(member: WorkspaceMember, channelId: string, query: HistoryQueryDto) {
    if (query.before !== undefined && query.after !== undefined)
      throw new BadRequestException('Use either before or after');

    const { channel, isMember } = await this.access.requireReadAccess(member, channelId);
    const direction = query.after === undefined ? 'before' : 'after';
    const cursorText = query.before ?? query.after;
    const cursor = cursorText === undefined ? undefined : BigInt(cursorText);
    const page = await this.history.page(
      channelId,
      direction,
      cursor,
      channel.lastEntrySeq,
      query.limit ?? 40,
    );
    const readState = isMember ? await this.readState.cursor(channelId, member.id) : null;
    const items = page.rows.map(({ seq, createdAt, message, pin }) => ({
      type: 'MESSAGE' as const,
      seq: seq.toString(),
      createdAt,
      message: messageView(message, seq),
      pin: pin ? { pinnedAt: pin.pinnedAt, pinnedByMemberId: pin.pinnedByMemberId } : null,
    }));
    const edge = direction === 'before' ? items[0] : items.at(-1);
    return {
      items,
      snapshotSeq: channel.lastEntrySeq.toString(),
      hasMore: page.hasMore,
      nextCursor: page.hasMore ? (edge?.seq ?? null) : null,
      readState,
    };
  }
}
