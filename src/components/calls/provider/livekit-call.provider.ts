import { Injectable } from '@nestjs/common';
import { AccessToken, RoomServiceClient, TwirpError } from 'livekit-server-sdk';

import { AppConfigService } from '@/globals/config';
import { Logger } from '@/globals/logger';

import { type CallJoinGrant, CallProvider, type ProviderCall } from './call.provider';

@Injectable()
export class LiveKitCallProvider extends CallProvider {
  private readonly url: string | undefined;
  private readonly apiKey: string | undefined;
  private readonly apiSecret: string | undefined;
  // Only ever constructed once, from the same three values `isConfigured` checks:
  // its presence *is* the configured check, not a second copy of it.
  private readonly rooms: RoomServiceClient | undefined;

  constructor(
    config: AppConfigService,
    private readonly logger: Logger,
  ) {
    super();
    this.url = config.get('LIVEKIT_URL');
    this.apiKey = config.get('LIVEKIT_API_KEY');
    this.apiSecret = config.get('LIVEKIT_API_SECRET');
    this.rooms =
      this.url && this.apiKey && this.apiSecret
        ? new RoomServiceClient(this.url, this.apiKey, this.apiSecret)
        : undefined;
  }

  get isConfigured(): boolean {
    return this.rooms !== undefined;
  }

  // LiveKit creates the room on the first join.
  async create(): Promise<void> {}

  async mintJoinToken(
    call: ProviderCall,
    input: { identity: string; name: string; ttlSeconds: number },
  ): Promise<CallJoinGrant> {
    if (!this.isConfigured || !this.url || !this.apiKey || !this.apiSecret) {
      throw new Error('LiveKit is not configured');
    }
    const token = new AccessToken(this.apiKey, this.apiSecret, {
      identity: input.identity,
      name: input.name,
      ttl: input.ttlSeconds,
    });
    token.addGrant({
      roomJoin: true,
      room: call.roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      // A key to one room, not to the server: no room admin/create/list/record.
      roomCreate: false,
      roomAdmin: false,
      roomList: false,
      roomRecord: false,
    });
    return {
      url: this.url,
      token: await token.toJwt(),
      expiresAt: new Date(Date.now() + input.ttlSeconds * 1000),
    };
  }

  // A room LiveKit has no record of (closed once empty, or never created) is
  // confirmed empty: 0 is correct, and the caller may end the call. Any other
  // failure (network, auth, a 5xx) is logged and reads as "occupied" instead of
  // empty: this only exists to decide whether a call may end, and ending it on
  // a transient error would be the exact bug this replaced — one bad request
  // silently closing a call other people are still on.
  async countParticipants({ roomName }: ProviderCall): Promise<number> {
    if (!this.rooms) return 0;
    try {
      const participants = await this.rooms.listParticipants(roomName);
      return participants.length;
    } catch (error) {
      if (error instanceof TwirpError && error.status === 404) return 0;
      this.logger.warn({ err: error, roomName }, 'Failed to list LiveKit room participants');
      return Number.POSITIVE_INFINITY;
    }
  }

  // The room closes itself once empty; nothing here outlives the call.
  async end(): Promise<void> {}
}
