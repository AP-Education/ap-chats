export abstract class RealtimePublisher {
  abstract toUser(appId: string, userId: string, event: string, payload: unknown): void;
  abstract toConversation(
    appId: string,
    conversationId: string,
    event: string,
    payload: unknown,
  ): void;
}
