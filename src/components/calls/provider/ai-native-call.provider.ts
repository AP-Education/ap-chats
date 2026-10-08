import { BadGatewayException, ForbiddenException, Injectable } from '@nestjs/common';

import { AppConfigService } from '@/globals/config';
import { Logger } from '@/globals/logger';

import { type CallJoinGrant, CallProvider, type ProviderCall } from './call.provider';

// TODO(tech debt): ai-native fixes the participant set when a call is created,
// so it caps calls at 50 and a member who joins the channel mid-call can't enter
// the room. Channel calls need a dynamic participant model there.
const MAX_PARTICIPANTS = 50;
const REQUEST_TIMEOUT_MS = 10_000;

interface TokenResponse {
  url: string;
  token: string;
  expiresAt: string;
}

interface CallResponse {
  participantCount: number | null;
}

/**
 * Media through ai-native's Call API, which adds recording and transcription
 * on top of its tenant LiveKit. It authorizes every request as the acting
 * user, so each call forwards that user's own bearer.
 */
@Injectable()
export class AiNativeCallProvider extends CallProvider {
  private readonly baseUrl: string | undefined;

  constructor(
    config: AppConfigService,
    private readonly logger: Logger,
  ) {
    super();
    this.baseUrl = config.get('AI_NATIVE_URL');
  }

  get isConfigured(): boolean {
    return this.baseUrl !== undefined;
  }

  async create(
    call: ProviderCall,
    input: { participantIds: string[]; group: boolean },
    accessToken: string,
  ): Promise<void> {
    if (input.participantIds.length > MAX_PARTICIPANTS) {
      throw new ForbiddenException(`Calls are limited to ${MAX_PARTICIPANTS} participants`);
    }

    await this.request('PUT', call.id, accessToken, input);
  }

  async mintJoinToken(
    call: ProviderCall,
    _input: unknown,
    accessToken: string,
  ): Promise<CallJoinGrant> {
    const grant = await this.request<TokenResponse>('POST', `${call.id}/token`, accessToken);

    return { url: grant.url, token: grant.token, expiresAt: new Date(grant.expiresAt) };
  }

  // ai-native reports null when it can't reach LiveKit; that, like a failed request, reads as occupied.
  async countParticipants(call: ProviderCall, accessToken: string): Promise<number> {
    try {
      const { participantCount } = await this.request<CallResponse>('GET', call.id, accessToken);
      return participantCount ?? Number.POSITIVE_INFINITY;
    } catch {
      return Number.POSITIVE_INFINITY;
    }
  }

  // A room left open still empties out and closes on ai-native's own timeout.
  async end(call: ProviderCall, accessToken: string): Promise<void> {
    try {
      await this.request('POST', `${call.id}/end`, accessToken);
    } catch (error) {
      this.logger.warn({ err: error, callId: call.id }, '[calls] ai-native failed to end call');
    }
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT',
    path: string,
    accessToken: string,
    body?: unknown,
  ): Promise<T> {
    const headers: Record<string, string> = { authorization: `Bearer ${accessToken}` };
    // Fastify rejects an empty body declared as JSON, so bodyless calls send no content-type.
    if (body !== undefined) headers['content-type'] = 'application/json';

    const response = await fetch(`${this.baseUrl}/api/calls/${path}`, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      this.logger.warn(
        { status: response.status, body: await response.text(), method, path },
        '[calls] ai-native rejected request',
      );
      throw new BadGatewayException('Call service request failed');
    }

    return (await response.json()) as T;
  }
}
