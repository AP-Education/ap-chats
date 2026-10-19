import type { ChannelKind } from '@/components/communities/channels/types';

import type { NotificationEventKind } from '../policy/types';

export interface UnreadEntryChange {
  seq: string;
  authorMemberId: string;
}

export interface UnreadEntry extends UnreadEntryChange {
  /** Mentions whoever the mutation is sent to; a removed entry never does, its mentions went with it. */
  mentioned: boolean;
}

export interface UnreadMutation {
  workspaceId: string;
  channelId: string;
  kind: ChannelKind;
  eventId: string;
  operation: 'append' | 'remove';
  subject: 'message' | 'call';
  entries: UnreadEntry[];
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
