export const SCHEDULED_MESSAGES_CHANGED_EVENT = 'social.scheduled-messages.changed';

/** The author's schedule for one channel changed; only their own devices hear of it. */
export class ScheduledMessagesChangedEvent {
  constructor(
    public readonly userId: string,
    public readonly workspaceId: string,
    public readonly channelId: string,
  ) {}
}
