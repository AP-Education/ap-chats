import http2 from 'node:http2';

import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { importPKCS8, SignJWT } from 'jose';

import type { CallSignalPayload } from '@/components/calls/events/call-signal.event';
import type { DeviceRecord } from '@/components/devices';
import { AppConfigService } from '@/globals/config';

import type { CallPushProvider } from './call-push-provider.types';
import { buildIncomingCallEvent, type IncomingCallEventWire } from './incoming-call-event';
import { PushProviderError } from './push-provider-error';

// Apple asks providers to reuse a provider token rather than mint one per push.
const TOKEN_TTL_MS = 50 * 60 * 1000;

@Injectable()
export class ApnsVoipPushProvider implements CallPushProvider, OnModuleDestroy {
  private readonly sessions = new Map<string, http2.ClientHttp2Session>();
  private readonly keyId: string | undefined;
  private readonly teamId: string | undefined;
  private readonly privateKeyPem: string | undefined;
  private readonly topic: string | undefined;
  private cachedToken: { jwt: string; issuedAt: number } | undefined;

  constructor(config: AppConfigService) {
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
    await this.post(device, bearer, { incomingCall: event });
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

  onModuleDestroy(): void {
    for (const session of this.sessions.values()) session.destroy();
    this.sessions.clear();
  }

  private post(
    device: DeviceRecord,
    bearer: string,
    body: { incomingCall: IncomingCallEventWire },
  ): Promise<void> {
    const host =
      device.apnsEnvironment === 'sandbox' ? 'api.sandbox.push.apple.com' : 'api.push.apple.com';
    let session = this.sessions.get(host);
    if (!session || session.closed || session.destroyed) {
      session = http2.connect(`https://${host}`);
      session.on('error', () => {
        session?.destroy();
      });
      this.sessions.set(host, session);
    }
    const connection = session;
    return new Promise((resolve, reject) => {
      const req = connection.request({
        ':method': 'POST',
        ':path': `/3/device/${device.voipToken}`,
        authorization: `bearer ${bearer}`,
        'apns-topic': this.topic,
        'apns-push-type': 'voip',
        'apns-priority': '10',
        'apns-expiration': '0',
        'apns-id': body.incomingCall.eventId,
      });
      const timer = setTimeout(() => {
        req.close();
        reject(new Error('APNs request timed out'));
      }, 10000);
      req.setEncoding('utf8');
      let responseBody = '';
      let status = 0;
      req.on('response', (headers) => {
        status = Number(headers[':status']);
      });
      req.on('data', (chunk: string) => {
        responseBody += chunk;
      });
      req.on('end', () => {
        clearTimeout(timer);
        if (status === 200) {
          resolve();
          return;
        }
        let reason = 'unknown';
        try {
          reason = (JSON.parse(responseBody) as { reason: string }).reason;
        } catch {
          /* non-JSON upstream response */
        }
        if (reason === 'ExpiredProviderToken') this.cachedToken = undefined;
        reject(
          new PushProviderError(
            `APNs rejected push: ${status} ${reason}`,
            ['BadDeviceToken', 'Unregistered', 'DeviceTokenNotForTopic'].includes(reason),
          ),
        );
      });
      req.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
      req.on('close', () => {
        clearTimeout(timer);
        reject(new Error('APNs connection closed'));
      });
      req.end(JSON.stringify(body));
    });
  }
}
