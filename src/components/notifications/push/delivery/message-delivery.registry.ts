import { Injectable } from '@nestjs/common';

import type { PushTargetKind } from '@/components/devices';

import { BrowserMessageDelivery } from './browser-message-delivery';
import type { MessagePushDelivery } from './message-push-delivery';
import { NativeMessageDelivery } from './native-message-delivery';

@Injectable()
export class MessageDeliveryRegistry {
  private readonly deliveries: Record<PushTargetKind, MessagePushDelivery>;

  constructor(
    native: NativeMessageDelivery,
    private readonly browser: BrowserMessageDelivery,
  ) {
    this.deliveries = { expo: native, web: browser };
  }

  get browserEnabled(): boolean {
    return this.browser.enabled;
  }

  get all(): MessagePushDelivery[] {
    return Object.values(this.deliveries);
  }

  resolve(kind: PushTargetKind): MessagePushDelivery {
    return this.deliveries[kind];
  }
}
