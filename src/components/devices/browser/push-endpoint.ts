import { BadRequestException } from '@nestjs/common';

const PROVIDERS = [
  'fcm.googleapis.com',
  'push.services.mozilla.com',
  'push.apple.com',
  'notify.windows.com',
];

export function validatePushSubscription(endpoint: string, p256dh: string, auth: string): void {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new BadRequestException('Invalid push endpoint');
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.hash ||
    (url.port && url.port !== '443') ||
    !PROVIDERS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))
  ) {
    throw new BadRequestException('Unsupported push endpoint');
  }
  const publicKey = Buffer.from(p256dh, 'base64url');
  if (
    publicKey.length !== 65 ||
    publicKey[0] !== 4 ||
    Buffer.from(auth, 'base64url').length !== 16
  ) {
    throw new BadRequestException('Invalid push subscription keys');
  }
}
