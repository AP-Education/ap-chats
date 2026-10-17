export interface WorkspaceChannelUnread {
  channelId: string;
  kind: 'channel' | 'dm';
  lastReadEntrySeq: string;
  unreadCount: number;
  /** Unread messages that mention the reader, @everyone and their roles included. */
  mentionCount: number;
}

export interface ChannelReadState {
  lastReadEntrySeq: string;
  unreadCount: number;
  mentionCount: number;
}

/** Where a viewer stands in a channel's history up to a snapshot. */
export interface ReadPosition {
  state: ChannelReadState | null;
  firstUnreadSeq: bigint | null;
  peerReadSeq: bigint | null;
}

export interface ReadPositionQuery {
  channelId: string;
  memberId: string;
  ceiling: bigint;
  withPeerRead: boolean;
}
