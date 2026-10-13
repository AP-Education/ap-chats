export const CALL_ENTRY_CREATED_EVENT = 'social.call.created';

// Mirrors social/messages/events/message-created.event.ts for a call entry.
export class CallEntryCreatedEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly channelId: string,
    public readonly callId: string,
    public readonly seq: string,
    public readonly actorMemberId: string,
  ) {}
}
