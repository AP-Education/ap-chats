import { createHash } from 'node:crypto';

import type { WebPushSubscription } from '../browser/web-push.types';

export function tokenFingerprint(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function subscriptionFingerprint(subscription: WebPushSubscription): string {
  return createHash('sha256')
    .update(JSON.stringify([subscription.endpoint, subscription.p256dh, subscription.auth]))
    .digest('hex');
}
