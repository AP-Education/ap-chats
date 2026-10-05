import type { PushTargetReference } from '@/components/devices';

import type { MessageNotificationPayload } from '../types';

/** Message delivery hides credentials, transport SDKs and permanent rejection handling. */
export abstract class MessagePushDelivery {
  abstract readonly queueName: string;
  abstract readonly rateLimit: { max: number; duration: number };

  abstract send(
    target: PushTargetReference,
    notification: MessageNotificationPayload,
    ttl: number,
  ): Promise<void>;
}
