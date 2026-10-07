import type { NotificationPayload } from '../types';

/** Where one person can be reached; only the version of its credential is stored in jobs. */
export interface ChannelTarget {
  channel: string;
  id: string;
  fingerprint: string;
}

export interface ChannelDelivery {
  queue: string;
  rateLimit: { max: number; duration: number };
}

/**
 * One way to reach a person: a mobile app, a browser, a messenger bot, a device on a desk.
 * The alert flow only lists targets and sends; transports, credentials and their failures stay here.
 */
export abstract class NotificationChannel {
  abstract readonly kind: string;
  abstract readonly enabled: boolean;
  abstract readonly delivery: ChannelDelivery;

  abstract listTargets(userId: string): Promise<ChannelTarget[]>;

  abstract send(
    target: ChannelTarget,
    notification: NotificationPayload,
    ttl: number,
  ): Promise<void>;
}

export const NOTIFICATION_CHANNELS = Symbol('NOTIFICATION_CHANNELS');
