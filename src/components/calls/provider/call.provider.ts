export interface CallJoinGrant {
  url: string;
  token: string;
  expiresAt: Date;
}

/**
 * The one thing a call needs from its media backend: a short-lived credential
 * for one person to join one room. Everything else (who may call whom, ring
 * state, persistence) lives above this and never touches a concrete provider.
 */
export abstract class CallProvider {
  abstract readonly isConfigured: boolean;

  abstract mintJoinToken(input: {
    roomName: string;
    identity: string;
    name: string;
    ttlSeconds: number;
  }): Promise<CallJoinGrant>;

  /**
   * How many people the media backend currently has connected to this room.
   * A confirmed-empty room reads as 0; a failed check must read as occupied,
   * never as 0, so callers deciding whether to end a call don't do so on a failure.
   */
  abstract countParticipants(roomName: string): Promise<number>;
}
