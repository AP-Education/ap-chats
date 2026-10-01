import type { ChannelReadState } from '../types';

export const READ_STATE_ADVANCED_EVENT = 'social.read-state.advanced';

export class ReadStateAdvancedEvent {
  constructor(
    public readonly userId: string,
    public readonly workspaceId: string,
    public readonly channelId: string,
    public readonly state: ChannelReadState,
  ) {}
}
