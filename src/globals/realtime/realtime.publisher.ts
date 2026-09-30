export abstract class RealtimePublisher {
  abstract toUser(userId: string, event: string, payload: unknown): void;
  abstract toConversation(conversationId: string, event: string, payload: unknown): void;
}
