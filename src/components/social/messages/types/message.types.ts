import type { Attachment } from '@/components/uploads/attachments/types';

// What a fresh post and a forward of it both carry unmodified: what's
// actually being said, and the token the client used to dedupe/trace it.
// Everything else is a row's own place in the channel (author, reply target,
// provenance, lifecycle timestamps).
export interface MessageContent {
  contentMarkdown: string;
  attachments: Attachment[];
  clientNonce: string;
}

export interface MessageModel extends MessageContent {
  id: string;
  workspaceId: string;
  channelId: string;
  authorMemberId: string;
  contentVersion: number;
  revision: number;
  replyToMessageId: string | null;
  quoteText: string | null;
  forwardedFromMessageId: string | null;
  forwardedFromMemberId: string | null;
  requestDigest: string;
  createdAt: Date;
  editedAt: Date | null;
  deletedAt: Date | null;
}

export interface MessageWithSeq {
  message: MessageModel;
  seq: bigint;
}

export type CreateMessageRecord = Pick<
  MessageModel,
  | 'workspaceId'
  | 'channelId'
  | 'authorMemberId'
  | 'contentMarkdown'
  | 'requestDigest'
  | 'clientNonce'
> &
  Partial<
    Pick<
      MessageModel,
      | 'attachments'
      | 'replyToMessageId'
      | 'quoteText'
      | 'forwardedFromMessageId'
      | 'forwardedFromMemberId'
    >
  >;

export interface ForwardMessageRecord extends MessageContent {
  sourceMessageId: string;
  sourceAuthorMemberId: string;
}
