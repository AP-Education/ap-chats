/** Whether a person is looking at the app on any connection right now. */
export abstract class AttentionRepository {
  abstract update(userId: string, connectionId: string, attending: boolean): Promise<void>;
  abstract isAttending(userId: string): Promise<boolean>;
}
