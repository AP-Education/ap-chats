import type { MemberSummary } from '@/components/workspaces/members/types';

export abstract class MentionsRepository {
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
  abstract replace(
    workspaceId: string,
    channelId: string,
    messageId: string,
    ids: string[],
  ): Promise<void>;
  abstract removeForMessages(ids: string[]): Promise<void>;
}
