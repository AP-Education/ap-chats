import type { MessageGif } from '../../content/message-gif';
import type { NormalizedMessageContent } from '../../content/message-markdown';

export interface Attachment {
  id: string;
  name: string;
  size: number;
  mediaType: string;
  preview: 'image' | 'video' | 'audio' | null;
  width: number | null;
  height: number | null;
  description: string | null;
}

// What a fresh post and a forward of it both carry unmodified: what's
// actually being said, and the token the client used to dedupe/trace it.
// Everything else is a row's own place in the channel (author, reply target,
// provenance, lifecycle timestamps).
export interface MessageContent {
  contentMarkdown: string;
  attachments: Attachment[];
  gif: MessageGif | null;
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

export interface MessageRef {
  workspaceId: string;
  channelId: string;
  messageId: string;
}

/** A message ready to post: checked against its channel, its files already claimed. */
export interface NewMessage {
  content: NormalizedMessageContent;
  attachments: Attachment[];
  gif: MessageGif | null;
  replyToMessageId: string | null;
  quoteText: string | null;
  clientNonce: string;
  requestDigest: string;
}

export interface ForwardedCopy extends MessageContent {
  sourceMessageId: string;
  sourceAuthorMemberId: string;
}

export interface DeletedMessage {
  id: string;
  seq: string;
  authorMemberId: string;
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
      | 'gif'
      | 'replyToMessageId'
      | 'quoteText'
      | 'forwardedFromMessageId'
      | 'forwardedFromMemberId'
    >
  >;
