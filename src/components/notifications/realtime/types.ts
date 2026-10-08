import type { ChannelKind } from '@/components/communities/channels';

import type { NotificationEventKind } from '../types';

export interface UnreadEntryChange {
  seq: string;
  authorMemberId: string;
}

export interface UnreadMutation {
  workspaceId: string;
  channelId: string;
  kind: ChannelKind;
  eventId: string;
  operation: 'append' | 'remove';
  subject: 'message' | 'call';
  entries: UnreadEntryChange[];
  alert: boolean;
}

export interface NotificationSourceEvent {
  workspaceId: string;
  channelId: string;
  eventId: string;
  kind: NotificationEventKind;
  operation: UnreadMutation['operation'];
  actorMemberId: string;
  entries: UnreadEntryChange[];
  messageIds: string[];
}
