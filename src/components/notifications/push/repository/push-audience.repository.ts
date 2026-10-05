import type { ChannelKind } from '@/components/communities/channels';

import type { StoredNotificationSettings } from '../../preferences/types';

export interface PushScope {
  workspaceId: string;
  channelId: string;
  firstSeq: string;
  lastSeq: string;
}

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

/** Read-only projection for bounded notification queries; writes stay with each owning module. */
export abstract class PushAudienceRepository {
  abstract context(scope: PushScope): Promise<PushContext | undefined>;
  abstract recipients(
    scope: PushScope,
    after?: string,
    memberId?: string,
  ): Promise<PushRecipient[]>;
  abstract lastCreatedAt(scope: PushScope): Promise<Date | undefined>;
  abstract latestMessage(
    scope: PushScope,
    recipient: PushRecipient,
    mentionsOnly: boolean,
  ): Promise<PushMessagePreview | undefined>;
}
