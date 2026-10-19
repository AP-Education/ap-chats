import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { RealtimePublisher } from '@/globals/realtime';

import {
  NOTIFICATIONS_CHANGED_EVENT,
  NotificationsChangedEvent,
} from './events/notifications-changed.event';

@Injectable()
export class NotificationSettingsRelay {
  constructor(private readonly realtime: RealtimePublisher) {}

  // Every device of the member takes the new state in place, the one that changed it included.
  @OnEvent(NOTIFICATIONS_CHANGED_EVENT)
  onChanged({ userId, workspaceId, notifications }: NotificationsChangedEvent) {
    this.realtime.toUser(userId, 'notifications:changed', { workspaceId, ...notifications });
  }
}
