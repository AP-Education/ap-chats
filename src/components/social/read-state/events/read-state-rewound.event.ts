import type { ChannelReadState } from '../types';

export const READ_STATE_REWOUND_EVENT = 'social.read-state.rewound';

/** The reader marked part of a channel unread again, so their cursor went back. */
export class ReadStateRewoundEvent {
  constructor(
    public readonly userId: string,
    public readonly workspaceId: string,
    public readonly channelId: string,
    public readonly state: ChannelReadState,
  ) {}
}
