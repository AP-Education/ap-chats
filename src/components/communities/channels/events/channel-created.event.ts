export const CHANNEL_CREATED_EVENT = 'communities.channel.created';

export class ChannelCreatedEvent {
  constructor(
    public readonly workspaceId: string,
    public readonly channelId: string,
    public readonly kind: 'public' | 'private',
  ) {}
}
