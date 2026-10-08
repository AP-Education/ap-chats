export abstract class CallPushRepository {
  abstract ringingForRecipient(
    workspaceId: string,
    channelId: string,
    callId: string,
    userId: string,
  ): Promise<{ startedAt: Date } | null>;
}
