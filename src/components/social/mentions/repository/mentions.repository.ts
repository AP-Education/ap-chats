export abstract class MentionsRepository {
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
  abstract replace(
    workspaceId: string,
    channelId: string,
    messageId: string,
    ids: string[],
  ): Promise<void>;
  abstract removeForMessages(ids: string[]): Promise<void>;
}
