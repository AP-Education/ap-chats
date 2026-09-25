import { jwtVerify, type JWTVerifyGetKey } from 'jose';

export interface AuthenticatedUser {
  sub: string;
  appId: string;
}

export interface AuthenticatedSession extends AuthenticatedUser {
  expiresAt: number;
}

export interface AccessTokenPolicy {
  issuer: string;
  audience: string;
}

export async function verifyAccessToken(
  token: string,
  jwks: JWTVerifyGetKey,
  policy: AccessTokenPolicy,
): Promise<AuthenticatedUser> {
  const { sub, appId } = await verifyAccessTokenSession(token, jwks, policy);
  return { sub, appId };
}

export async function verifyAccessTokenSession(
  token: string,
  jwks: JWTVerifyGetKey,
  policy: AccessTokenPolicy,
): Promise<AuthenticatedSession> {
  const { payload } = await jwtVerify(token, jwks, {
    issuer: policy.issuer,
    audience: policy.audience,
    algorithms: ['RS256'],
    requiredClaims: ['exp', 'iat', 'sub', 'appId'],
    clockTolerance: 5,
  });

  if (
    typeof payload.sub !== 'string' ||
    !payload.sub ||
    typeof payload.appId !== 'string' ||
    !payload.appId ||
    typeof payload.exp !== 'number'
  ) {
    throw new Error('Invalid access token identity');
  }

  return { sub: payload.sub, appId: payload.appId, expiresAt: payload.exp };
}
