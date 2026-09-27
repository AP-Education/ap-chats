export abstract class MentionsRepository {
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
