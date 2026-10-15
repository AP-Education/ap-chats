import type { MemberSummary } from '@/components/workspaces/members/types';

import type { MentionedMessage } from '../types';

export abstract class MentionsRepository {
  /** Everyone a message reached, whether named directly, through a role or through @everyone. */
  abstract mentionedMemberIds(messageIds: string[]): Promise<string[]>;
  abstract candidates(
    workspaceId: string,
    channelId: string,
    query: string,
  ): Promise<MemberSummary[]>;
  /** Members of the channel, or the workspace's bots outside direct messages. */
  abstract allActiveInChannel(
    workspaceId: string,
    channelId: string,
    ids: string[],
  ): Promise<boolean>;
  /** Drops every recipient of the message and records these as named directly. */
  abstract replaceDirect(message: MentionedMessage, memberIds: string[]): Promise<void>;
  /** Adds the roles' people who are in the channel and records which roles reached each. */
  abstract addRoles(message: MentionedMessage, roleIds: string[]): Promise<void>;
  /** Adds the channel's other active members, keeping anyone already reached. */
  abstract addEveryone(message: MentionedMessage): Promise<void>;
  abstract removeForMessages(ids: string[]): Promise<void>;
}
