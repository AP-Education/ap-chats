import type { WebPushRegistration, WebPushSubscription } from '../web-push.types';

export abstract class WebPushRepository {
  abstract register(userId: string, subscription: WebPushRegistration): Promise<{ id: string }>;
  abstract remove(userId: string, id: string): Promise<void>;
  abstract forUser(userId: string): Promise<WebPushSubscription[]>;
  abstract find(id: string): Promise<WebPushSubscription | undefined>;
  abstract invalidate(subscription: WebPushSubscription): Promise<void>;
}
