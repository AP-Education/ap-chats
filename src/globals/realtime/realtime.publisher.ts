export abstract class RealtimePublisher {
  abstract toUser(userId: string, event: string, payload: unknown): void;

  /**
   * Sends to the people watching a room, narrowed by `admit` to those still allowed to see it.
   * Everyone else's sockets leave the room, so losing access also ends the subscription.
   */
  abstract toWatchers(
    room: string,
    event: string,
    payload: unknown,
    admit: (userIds: string[]) => Promise<string[]>,
  ): Promise<void>;
}
