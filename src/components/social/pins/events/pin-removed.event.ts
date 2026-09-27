export const PIN_REMOVED_EVENT = 'social.pin.removed';

export class PinRemovedEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly channelId: string,
    public readonly messageId: string,
    public readonly actorMemberId: string,
  ) {}
}
