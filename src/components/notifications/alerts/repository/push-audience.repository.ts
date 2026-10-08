import type { ChannelKind } from '@/components/communities/channels';

import type { StoredNotificationSettings } from '../../preferences/types';
import type { ConversationRange, ConversationScope } from '../types';

export const RECIPIENTS_PAGE_SIZE = 100;

export interface AlertConversation {
  name: string | null;
  kind: ChannelKind;
  lastSeq: bigint;
}

/** A member with someone else's unread message in the range. */
export interface PushRecipient extends StoredNotificationSettings {
  userId: string;
  lastReadEntrySeq: bigint;
  mentioned: boolean;
}

export interface PushMessagePreview {
  contentMarkdown: string;
  actorName: string | null;
}

/** A read-only view across membership, cursors, settings and mentions, owned by their modules. */
export abstract class PushAudienceRepository {
  /** The conversation while it can still alert; a DM whose peer left cannot. */
  abstract conversation(scope: ConversationScope): Promise<AlertConversation | undefined>;
  /** One page, ordered by member, after the given member. */
  abstract recipients(range: ConversationRange, after?: string): Promise<PushRecipient[]>;
  abstract memberRecipient(
    range: ConversationRange,
    memberId: string,
  ): Promise<PushRecipient | undefined>;
  abstract latestMessageAt(range: ConversationRange): Promise<Date | undefined>;
  abstract latestMessage(
    range: ConversationRange,
    recipient: PushRecipient,
    mentionsOnly: boolean,
  ): Promise<PushMessagePreview | undefined>;
}
