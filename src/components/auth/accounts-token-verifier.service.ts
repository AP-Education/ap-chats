import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createRemoteJWKSet } from 'jose';

import { AppConfigService } from '@/globals/config';

import {
  type AccessTokenPolicy,
  type AuthenticatedSession,
  type AuthenticatedUser,
  verifyAccessToken,
  verifyAccessTokenSession,
} from './access-token';

@Injectable()
export class AccountsTokenVerifier {
  private readonly policy: AccessTokenPolicy | null;
  private readonly jwks: ReturnType<typeof createRemoteJWKSet> | null;

  constructor(config: AppConfigService) {
    const issuer = config.get('OIDC_ISSUER');
    const audience = config.get('OIDC_AUDIENCE');

    this.policy = issuer && audience ? { issuer, audience } : null;
    this.jwks = issuer
      ? createRemoteJWKSet(new URL(`${issuer.replace(/\/$/, '')}/jwks`), {
          timeoutDuration: 5000,
        })
      : null;
  }

  verify(token: string): Promise<AuthenticatedUser> {
    const policy = this.requirePolicy();
    return verifyAccessToken(token, policy.jwks, policy.token);
  }

  verifySession(token: string): Promise<AuthenticatedSession> {
    const policy = this.requirePolicy();
    return verifyAccessTokenSession(token, policy.jwks, policy.token);
  }

  private requirePolicy(): {
    jwks: ReturnType<typeof createRemoteJWKSet>;
    token: AccessTokenPolicy;
  } {
    if (!this.policy || !this.jwks) {
      throw new ServiceUnavailableException('OIDC is not configured');
    }
    return { jwks: this.jwks, token: this.policy };
  }
}
