export const PIN_ADDED_EVENT = 'social.pin.added';

export class PinAddedEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly channelId: string,
    public readonly messageId: string,
    public readonly actorMemberId: string,
  ) {}
}
