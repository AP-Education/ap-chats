import type { CallRecord } from '../types';

export interface CallJoinGrant {
  url: string;
  token: string;
  expiresAt: Date;
}

export type ProviderCall = Pick<CallRecord, 'id' | 'roomName'>;

/**
 * What a call needs from its media backend: a room it knows about, a
 * short-lived credential for one person to join it, and a way to close it.
 * Everything else (who may call whom, ring state, persistence) lives above
 * this and never touches a concrete provider. `accessToken` is the acting
 * user's own bearer, for backends that authorize each participant themselves.
 */
export abstract class CallProvider {
  abstract readonly isConfigured: boolean;

  /** Registers the call before anyone is rung, with everyone allowed to join it. */
  abstract create(
    call: ProviderCall,
    input: { participantIds: string[]; group: boolean },
    accessToken: string,
  ): Promise<void>;

  abstract mintJoinToken(
    call: ProviderCall,
    input: { identity: string; name: string; ttlSeconds: number },
    accessToken: string,
  ): Promise<CallJoinGrant>;

  /**
   * How many people the media backend currently has connected to this room.
   * A confirmed-empty room reads as 0; a failed check must read as occupied,
   * never as 0, so callers deciding whether to end a call don't do so on a failure.
   */
  abstract countParticipants(call: ProviderCall, accessToken: string): Promise<number>;

  abstract end(call: ProviderCall, accessToken: string): Promise<void>;
}
