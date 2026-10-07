import type { ChannelKind } from '@/components/communities/channels';

import type { ConversationRange } from '../../delivery/types';
import type { StoredNotificationSettings } from '../../preferences/types';

export interface PushContext {
  name: string | null;
  kind: ChannelKind;
  lastSeq: bigint;
}

export interface PushRecipient extends StoredNotificationSettings {
  userId: string;
  lastReadEntrySeq: bigint;
  mentioned: boolean;
}

export interface PushMessagePreview {
  contentMarkdown: string;
  actorName: string | null;
}

export abstract class PushAudienceRepository {
  abstract context(scope: ConversationRange): Promise<PushContext | undefined>;
  abstract recipients(
    scope: ConversationRange,
    after?: string,
    memberId?: string,
  ): Promise<PushRecipient[]>;
  abstract lastCreatedAt(scope: ConversationRange): Promise<Date | undefined>;
  abstract latestMessage(
    scope: ConversationRange,
    recipient: PushRecipient,
    mentionsOnly: boolean,
  ): Promise<PushMessagePreview | undefined>;
}
