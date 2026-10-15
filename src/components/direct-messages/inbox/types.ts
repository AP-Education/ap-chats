import type { NotificationLevel } from '@/components/notifications/preferences/types';

interface ConversationPerson {
  id: string;
  status: string;
  displayName: string | null;
  avatarPath: string | null;
}

export interface ConversationRow {
  channel: { id: string; workspaceId: string; updatedAt: Date };
  viewerId: string;
  notification: { muted: boolean; mutedUntil: Date | null; level: NotificationLevel };
  first: ConversationPerson;
  second: ConversationPerson;
  lastMessage: {
    id: string;
    markdown: string;
    deletedAt: Date | null;
    authorMemberId: string;
    createdAt: Date;
  } | null;
}

export interface InboxCursor {
  at: Date;
  id: string;
}
