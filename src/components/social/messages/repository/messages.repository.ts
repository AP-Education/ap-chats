import type {
  CreateMessageRecord,
  ForwardMessageRecord,
  MessageModel,
  MessageWithSeq,
} from '../types/message.types';

export abstract class MessagesRepository {
  abstract findByNonce(
    channelId: string,
    authorMemberId: string,
    clientNonce: string,
  ): Promise<MessageModel | null>;
  abstract findById(
    workspaceId: string,
    channelId: string,
    id: string,
  ): Promise<MessageModel | null>;
  abstract findMany(channelId: string, ids: string[]): Promise<MessageModel[]>;
  abstract findWithEntries(channelId: string, ids: string[]): Promise<MessageWithSeq[]>;
  abstract entrySeq(messageId: string): Promise<bigint>;
  abstract insert(data: CreateMessageRecord): Promise<MessageModel>;
  abstract insertForwardBatch(
    workspaceId: string,
    channelId: string,
    authorMemberId: string,
    sources: ForwardMessageRecord[],
    requestDigest: string,
  ): Promise<MessageModel[]>;
  abstract updateContent(id: string, markdown: string, nextRevision: number): Promise<MessageModel>;
  abstract tombstone(ids: string[]): Promise<void>;
}
