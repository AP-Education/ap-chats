export interface ScheduledMessage {
  id: string;
  authorMemberId: string;
  clientNonce: string;
  markdown: string;
  replyToMessageId: string | null;
  quoteText: string | null;
  sendAt: string;
  revision: number;
  /** Why it did not go out at its time; it waits for a new time or a send by hand. */
  failure: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleMessageCommand {
  markdown: string;
  replyToMessageId?: string;
  quoteText?: string;
}

/** What the composer hands over to be sent later, and how it learns the hand-over is done. */
export interface ScheduleRequest {
  input: ScheduleMessageCommand;
  onScheduled: () => void;
}

// Mirrors SocialEventsRelay on the API: only the author's own devices hear of their schedule.
export type SchedulingServerToClientEvents = {
  'social:scheduled': (payload: { workspaceId: string; channelId: string }) => void;
};
