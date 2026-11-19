import { createSign, randomBytes } from 'node:crypto';

/** One part of an Expo Updates protocol 1 response. */
export interface ExpoResponsePart {
  name: 'manifest' | 'directive' | 'extensions';
  body: object;
}

export interface ExpoMultipartBody {
  contentType: string;
  body: string;
}

/**
 * `sig="…", keyid="…"`: an RFC 8941 dictionary over an RSA-SHA256 signature of the exact part
 * body, which the client checks against the certificate embedded in its binary.
 */
export function signPart(body: string, privateKeyPem: string, keyId = 'main'): string {
  const signature = createSign('RSA-SHA256').update(body, 'utf8').sign(privateKeyPem, 'base64');
  return `sig="${signature}", keyid="${keyId}"`;
}

/**
 * A `multipart/mixed` body the way `expo-updates` reads it. Each part body is serialized once
 * and signed as sent: re-serializing after signing would change the bytes the client verifies.
 */
export function expoMultipart(
  parts: readonly ExpoResponsePart[],
  sign?: (body: string) => string,
): ExpoMultipartBody {
  const boundary = `expo-${randomBytes(16).toString('hex')}`;
  const chunks = parts.map(({ name, body }) => {
    const json = JSON.stringify(body);
    const headers = [
      `content-disposition: form-data; name="${name}"`,
      'content-type: application/json; charset=utf-8',
      ...(sign && name !== 'extensions' ? [`expo-signature: ${sign(json)}`] : []),
    ];
    return `--${boundary}\r\n${headers.join('\r\n')}\r\n\r\n${json}\r\n`;
  });

  return {
    contentType: `multipart/mixed; boundary=${boundary}`,
    body: `${chunks.join('')}--${boundary}--\r\n`,
  };
}
