export interface WorkspaceChannelUnread {
  channelId: string;
  kind: 'channel' | 'dm';
  lastReadEntrySeq: string;
  unreadCount: number;
}

export interface ChannelReadState {
  lastReadEntrySeq: string;
  unreadCount: number;
}

export interface MarkReadOutcome {
  state: ChannelReadState;
  advanced: boolean;
}
