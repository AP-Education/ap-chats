import http2 from 'node:http2';

import { Injectable } from '@nestjs/common';
import { importPKCS8, SignJWT } from 'jose';

import type { CallSignalPayload } from '@/components/calls/events/call-signal.event';
import type { DeviceRecord } from '@/components/devices';
import { AppConfigService } from '@/globals/config';
import { Logger } from '@/globals/logger';

import type { CallPushProvider } from './call-push-provider.types';
import { buildIncomingCallEvent } from './incoming-call-event';

// Apple's unified endpoint routes both dev and prod builds for token-based auth —
// no separate sandbox host to pick between.
const APNS_HOST = 'api.push.apple.com';
// Apple asks providers to reuse a provider token rather than mint one per push.
const TOKEN_TTL_MS = 50 * 60 * 1000;

@Injectable()
export class ApnsVoipPushProvider implements CallPushProvider {
  private readonly keyId: string | undefined;
  private readonly teamId: string | undefined;
  private readonly privateKeyPem: string | undefined;
  private readonly topic: string | undefined;
  private cachedToken: { jwt: string; issuedAt: number } | undefined;

  constructor(
    config: AppConfigService,
    private readonly logger: Logger,
  ) {
    this.keyId = config.get('APNS_KEY_ID');
    this.teamId = config.get('APNS_TEAM_ID');
    this.privateKeyPem = config.get('APNS_PRIVATE_KEY');
    this.topic = config.get('APNS_VOIP_TOPIC');
  }

  get isConfigured(): boolean {
    return Boolean(this.keyId && this.teamId && this.privateKeyPem && this.topic);
  }

  async sendIncomingCall(device: DeviceRecord, payload: CallSignalPayload): Promise<void> {
    if (!this.isConfigured || !device.voipToken) return;
    const bearer = await this.authToken();
    const event = buildIncomingCallEvent(payload);
    await this.post(device.voipToken, bearer, { incomingCall: event });
  }

  private async authToken(): Promise<string> {
    if (this.cachedToken && Date.now() - this.cachedToken.issuedAt < TOKEN_TTL_MS) {
      return this.cachedToken.jwt;
    }
    const key = await importPKCS8(this.privateKeyPem!, 'ES256');
    const jwt = await new SignJWT({})
      .setProtectedHeader({ alg: 'ES256', kid: this.keyId! })
      .setIssuer(this.teamId!)
      .setIssuedAt()
      .sign(key);
    this.cachedToken = { jwt, issuedAt: Date.now() };
    return jwt;
  }

  private post(voipToken: string, bearer: string, body: unknown): Promise<void> {
    return new Promise((resolve) => {
      const session = http2.connect(`https://${APNS_HOST}`);
      session.on('error', (error) => {
        this.logger.warn({ error }, '[voip-push] apns session error');
        resolve();
      });

      const req = session.request({
        ':method': 'POST',
        ':path': `/3/device/${voipToken}`,
        authorization: `bearer ${bearer}`,
        'apns-topic': this.topic,
        'apns-push-type': 'voip',
        'apns-priority': '10',
        'apns-expiration': '0',
      });
      req.setEncoding('utf8');

      let responseBody = '';
      let status: number | undefined;
      req.on('response', (headers) => {
        status = Number(headers[':status']);
      });
      req.on('data', (chunk: string) => {
        responseBody += chunk;
      });
      req.on('end', () => {
        if (status && status >= 400) {
          this.logger.warn({ status, body: responseBody }, '[voip-push] apns rejected push');
        }
        session.close();
        resolve();
      });
      req.on('error', (error) => {
        this.logger.warn({ error }, '[voip-push] apns request error');
        session.close();
        resolve();
      });
      req.end(JSON.stringify(body));
    });
  }
}
