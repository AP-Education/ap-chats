import { jwtVerify, type JWTVerifyGetKey } from 'jose';

export interface AuthenticatedUser {
  sub: string;
  appId: string;
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
    !payload.appId
  ) {
    throw new Error('Invalid access token identity');
  }

  return { sub: payload.sub, appId: payload.appId };
}
