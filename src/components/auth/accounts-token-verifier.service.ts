import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createRemoteJWKSet } from 'jose';

import { AppConfigService } from '@/globals/config';

import {
  type AccessTokenPolicy,
  type AuthenticatedUser,
  verifyAccessToken,
  verifyProfileIdToken,
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
          // A rotated key arrives under a new kid, which reloads the set on its own; an expiring
          // cache would instead hold up whichever request comes next while it refetches.
          cacheMaxAge: Infinity,
        })
      : null;
  }

  verify(token: string): Promise<AuthenticatedUser> {
    const policy = this.requirePolicy();
    return verifyAccessToken(token, policy.jwks, policy.token);
  }

  async verifyProfile(
    idToken: string,
    expectedSub: string,
    expectedAppId: string,
  ): Promise<{
    displayName: string;
    avatarPath: string | null;
    issuedAt: Date;
  }> {
    const { jwks, token } = this.requirePolicy();
    return verifyProfileIdToken(idToken, jwks, token.issuer, expectedSub, expectedAppId);
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
