import { Injectable } from '@nestjs/common';
import { importPKCS8, SignJWT } from 'jose';

import type { CallSignalPayload } from '@/components/calls/events/call-signal.event';
import type { DeviceRecord } from '@/components/devices';
import { AppConfigService } from '@/globals/config';
import { Logger } from '@/globals/logger';

import type { CallPushProvider } from './call-push-provider.types';
import { buildIncomingCallEvent } from './incoming-call-event';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

@Injectable()
export class FcmPushProvider implements CallPushProvider {
  private readonly projectId: string | undefined;
  private readonly account: ServiceAccount | undefined;
  private cachedToken: { accessToken: string; expiresAt: number } | undefined;

  constructor(
    config: AppConfigService,
    private readonly logger: Logger,
  ) {
    this.projectId = config.get('FCM_PROJECT_ID');
    const raw = config.get('FCM_SERVICE_ACCOUNT_JSON');
    this.account = raw ? (JSON.parse(raw) as ServiceAccount) : undefined;
  }

  get isConfigured(): boolean {
    return Boolean(this.projectId && this.account);
  }

  async sendIncomingCall(device: DeviceRecord, payload: CallSignalPayload): Promise<void> {
    // The library registers its own FCM token for call pushes (`getVoIPPushToken`,
    // type "FCM") — distinct from device.pushToken, which is the general Expo
    // push token used for ordinary notifications.
    if (!this.isConfigured || !device.voipToken) return;
    const accessToken = await this.authToken();
    const event = buildIncomingCallEvent(payload);

    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${this.projectId}/messages:send`,
      {
        method: 'POST',
        headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          message: {
            token: device.voipToken,
            data: { messageType: 'incomingCall', incomingCall: JSON.stringify(event) },
            android: { priority: 'high' },
          },
        }),
      },
    );
    if (!response.ok) {
      this.logger.warn(
        { status: response.status, body: await response.text() },
        '[voip-push] fcm rejected push',
      );
    }
  }

  private async authToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.cachedToken.expiresAt) {
      return this.cachedToken.accessToken;
    }
    const account = this.account!;
    const key = await importPKCS8(account.private_key, 'RS256');
    const now = Math.floor(Date.now() / 1000);
    const assertion = await new SignJWT({ scope: SCOPE })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuer(account.client_email)
      .setSubject(account.client_email)
      .setAudience(TOKEN_URL)
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .sign(key);

    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
    });
    const body = (await response.json()) as { access_token: string; expires_in: number };
    this.cachedToken = {
      accessToken: body.access_token,
      expiresAt: Date.now() + (body.expires_in - 60) * 1000,
    };
    return this.cachedToken.accessToken;
  }
}
