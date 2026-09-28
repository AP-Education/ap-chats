import type { MessageWithSeq } from '../../messages/types/message.types';

export abstract class ForwardingRepository {
  abstract findByNonces(
    channelId: string,
    authorMemberId: string,
    nonces: string[],
  ): Promise<MessageWithSeq[]>;
}
