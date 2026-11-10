import type { Attachment } from '@/features/social/messaging/attachments/types';
import type { SendMessageCommand } from '@/features/social/messaging/types';

export interface ScheduledMessage {
  id: string;
  authorMemberId: string;
  clientNonce: string;
  markdown: string;
  attachments?: Attachment[];
  replyToMessageId: string | null;
  quoteText: string | null;
  sendAt: string;
  revision: number;
  /** Why it did not go out at its time; it waits for a new time or a send by hand. */
  failure: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ScheduleMessageCommand = Pick<
  SendMessageCommand,
  'markdown' | 'clientNonce' | 'replyToMessageId' | 'quoteText' | 'attachments'
>;

// Mirrors SocialEventsRelay on the API: only the author's own devices hear of their schedule.
export type SchedulingServerToClientEvents = {
  'social:scheduled': (payload: { workspaceId: string; channelId: string }) => void;
};
