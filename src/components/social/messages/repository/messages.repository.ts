import type { MessageGif } from '../../content/message-gif';
import type {
  CreateMessageRecord,
  ForwardedCopy,
  MessageModel,
  MessageWithSeq,
} from '../types/message.types';

export abstract class MessagesRepository {
  abstract findByNonce(
    channelId: string,
    authorMemberId: string,
    clientNonce: string,
  ): Promise<MessageModel | null>;
  abstract findByNonces(
    channelId: string,
    authorMemberId: string,
    clientNonces: string[],
  ): Promise<MessageWithSeq[]>;
  abstract findById(
    workspaceId: string,
    channelId: string,
    id: string,
  ): Promise<MessageModel | null>;
  abstract findMany(channelId: string, ids: string[]): Promise<MessageModel[]>;
  abstract findWithEntries(channelId: string, ids: string[]): Promise<MessageWithSeq[]>;
  abstract entrySeq(messageId: string): Promise<bigint>;
  abstract insert(data: CreateMessageRecord): Promise<MessageModel>;
  abstract insertForwarded(input: {
    workspaceId: string;
    channelId: string;
    authorMemberId: string;
    copies: ForwardedCopy[];
    requestDigest: string;
  }): Promise<MessageModel[]>;
  abstract updateContent(
    id: string,
    content: { markdown: string; gif: MessageGif | null; revision: number },
  ): Promise<MessageModel>;
  abstract tombstone(ids: string[]): Promise<void>;
}
