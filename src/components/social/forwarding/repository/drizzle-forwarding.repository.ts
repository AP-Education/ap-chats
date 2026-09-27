import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { and, eq, inArray } from 'drizzle-orm';

import { channelEntries, chatMessages } from '@/database/drizzle/schema';
import type { DrizzleTransactionAdapter } from '@/database/drizzle/transactional-drizzle.module';

import type { MessageWithSeq } from '../../messages/types/message.types';
import { ForwardingRepository } from './forwarding.repository';

@Injectable()
export class DrizzleForwardingRepository extends ForwardingRepository {
  constructor(private readonly txHost: TransactionHost<DrizzleTransactionAdapter>) {
    super();
  }

  async findByNonces(
    channelId: string,
    authorMemberId: string,
    nonces: string[],
  ): Promise<MessageWithSeq[]> {
    return this.txHost.tx
      .select({ message: chatMessages, seq: channelEntries.seq })
      .from(chatMessages)
      .innerJoin(channelEntries, eq(channelEntries.messageId, chatMessages.id))
      .where(
        and(
          eq(chatMessages.channelId, channelId),
          eq(chatMessages.authorMemberId, authorMemberId),
          inArray(chatMessages.clientNonce, nonces),
        ),
      );
  }
}
