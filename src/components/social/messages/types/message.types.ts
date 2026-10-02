import type { Attachment } from '@/components/uploads/attachments/types';

export interface MessageModel {
  id: string;
  workspaceId: string;
  channelId: string;
  authorMemberId: string;
  contentMarkdown: string;
  attachments: Attachment[];
  contentVersion: number;
  revision: number;
  replyToMessageId: string | null;
  quoteText: string | null;
  forwardedFromMessageId: string | null;
  forwardedFromMemberId: string | null;
  requestDigest: string;
  clientNonce: string;
  createdAt: Date;
  editedAt: Date | null;
  deletedAt: Date | null;
}

export interface MessageWithSeq {
  message: MessageModel;
  seq: bigint;
}

export interface CreateMessageRecord {
  workspaceId: string;
  channelId: string;
  authorMemberId: string;
  contentMarkdown: string;
  attachments?: Attachment[];
  replyToMessageId?: string | null;
  quoteText?: string | null;
  forwardedFromMessageId?: string | null;
  forwardedFromMemberId?: string | null;
  requestDigest: string;
  clientNonce: string;
}

export interface ForwardMessageRecord {
  sourceMessageId: string;
  sourceAuthorMemberId: string;
  contentMarkdown: string;
  attachments: Attachment[];
  clientNonce: string;
}
