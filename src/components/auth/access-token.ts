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
    !payload.appId ||
    typeof payload.exp !== 'number'
  ) {
    throw new Error('Invalid access token identity');
  }

  return { sub: payload.sub, appId: payload.appId };
}

export async function verifyProfileIdToken(
  idToken: string,
  jwks: JWTVerifyGetKey,
  issuer: string,
  expectedSub: string,
  expectedAppId: string,
): Promise<{ displayName: string; avatarPath: string | null; issuedAt: Date }> {
  const { payload } = await jwtVerify(idToken, jwks, {
    issuer,
    algorithms: ['RS256'],
    requiredClaims: ['exp', 'iat', 'sub'],
    clockTolerance: 5,
  });
  if (
    payload.sub !== expectedSub ||
    payload.appId !== expectedAppId ||
    !payload.aud ||
    typeof payload.name !== 'string' ||
    !payload.name.trim() ||
    typeof payload.iat !== 'number'
  ) {
    throw new Error('Invalid ID token profile');
  }
  return {
    displayName: payload.name.trim(),
    avatarPath: typeof payload.picture === 'string' ? payload.picture : null,
    issuedAt: new Date(payload.iat * 1000),
  };
}
