import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createRemoteJWKSet } from 'jose';

import { AppConfigService } from '../../globals/config/config.service';
import { type AccessTokenPolicy, type AuthenticatedUser, verifyAccessToken } from './access-token';

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
    if (!this.policy || !this.jwks) {
      throw new ServiceUnavailableException('OIDC is not configured');
    }
    return verifyAccessToken(token, this.jwks, this.policy);
  }
}
