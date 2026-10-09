import type { MentionedMessage } from '../types';

export abstract class MentionsRepository {
  /** Everyone a message reached, whether named directly or through @everyone. */
  abstract mentionedMemberIds(messageIds: string[]): Promise<string[]>;
  abstract candidates(
    workspaceId: string,
    channelId: string,
    query: string,
  ): Promise<{ memberId: string; displayName: string | null; avatarPath: string | null }[]>;
  abstract allActiveInChannel(
    workspaceId: string,
    channelId: string,
    ids: string[],
  ): Promise<boolean>;
  /** Drops every recipient of the message and records these as named directly. */
  abstract replaceDirect(message: MentionedMessage, memberIds: string[]): Promise<void>;
  /** Adds the channel's other active members, keeping anyone already named directly. */
  abstract addEveryone(message: MentionedMessage): Promise<void>;
  abstract removeForMessages(ids: string[]): Promise<void>;
}
