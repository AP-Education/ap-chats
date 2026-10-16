export interface ScheduledMessageModel {
  id: string;
  workspaceId: string;
  channelId: string;
  authorMemberId: string;
  contentMarkdown: string;
  replyToMessageId: string | null;
  quoteText: string | null;
  sendAt: Date;
  revision: number;
  requestDigest: string;
  clientNonce: string;
  /** Why the message did not go out at its time; it waits for its author until then. */
  failure: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type NewScheduledMessage = Pick<
  ScheduledMessageModel,
  | 'workspaceId'
  | 'channelId'
  | 'authorMemberId'
  | 'contentMarkdown'
  | 'replyToMessageId'
  | 'quoteText'
  | 'sendAt'
  | 'requestDigest'
  | 'clientNonce'
>;

export type ScheduledMessageChange = Partial<
  Pick<ScheduledMessageModel, 'contentMarkdown' | 'sendAt' | 'failure'>
>;
