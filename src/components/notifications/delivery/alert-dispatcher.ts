import { Injectable, type OnModuleInit } from '@nestjs/common';

import { AppConfigService } from '@/globals/config';
import { jobId } from '@/globals/jobs/job-id';
import { JobQueue } from '@/globals/jobs/job-queue';

import { NotificationChannelRegistry } from './channels/notification-channel.registry';
import { NotificationContent } from './notification-content';
import { NotificationWindowsRepository } from './repository/notification-windows.repository';
import {
  type ConversationAlert,
  type MessageDeliveryJob,
  type NotificationWindow,
  PUSH_ALERT_DUE_QUEUE,
} from './types';

/** Turns a due alert into per-device deliveries, within each person's cooldown and budget. */
@Injectable()
export class AlertDispatcher implements OnModuleInit {
  constructor(
    private readonly jobs: JobQueue,
    private readonly content: NotificationContent,
    private readonly windows: NotificationWindowsRepository,
    private readonly channels: NotificationChannelRegistry,
    private readonly config: AppConfigService,
  ) {}

  onModuleInit(): void {
    if (!this.config.get('PUSH_ENABLED') || !this.config.get('PUSH_WORKER_ENABLED')) return;

    this.jobs.work<ConversationAlert>(PUSH_ALERT_DUE_QUEUE, (alert) => this.dispatch(alert));
  }

  async dispatch(request: ConversationAlert): Promise<void> {
    const previous = await this.windows.latest(request.userId, request.channelId);
    const isCovered =
      previous && previous.id !== request.id && previous.lastSeq >= BigInt(request.lastSeq);
    if (isCovered) return;

    const latestSeq = await this.content.latestSeq(request);
    if (latestSeq === null) return;

    const candidate = nextWindow(request, previous, latestSeq);
    const eligible = await this.content.findEligible(candidate);
    if (!eligible) return;

    const targets = await this.channels.listTargets(request.userId);
    if (!targets.length) return;

    const reservation = await this.windows.reserve(candidate, new Date(), {
      cooldownSeconds: this.config.get('PUSH_COOLDOWN_SECONDS'),
      userAlertsPerMinute: this.config.get('PUSH_USER_ALERTS_PER_MINUTE'),
      urgent: eligible.urgent,
    });
    if (reservation.status === 'superseded') return;
    if (reservation.status === 'deferred') return this.defer(request, reservation.until);

    const alert = withWindow(candidate, reservation.window);

    // Retry the same reservation after an enqueue failure; stable child IDs prevent duplicate jobs.
    for (const target of targets) {
      await this.jobs.enqueue<MessageDeliveryJob>(
        this.channels.resolve(target.channel).delivery.queue,
        { alert, target },
        {
          id: jobId(`${alert.id}:${target.channel}:${target.id}:${target.fingerprint}`),
          expiresAt: reservation.window.expiresAt.getTime(),
        },
      );
    }
  }

  // A throttled alert waits for its window instead of being dropped; the rerun covers every message since.
  private async defer(request: ConversationAlert, until: Date): Promise<void> {
    await this.jobs.enqueue(PUSH_ALERT_DUE_QUEUE, request, {
      id: jobId(`${request.id}:deferred:${until.getTime()}`),
      delay: Math.max(0, until.getTime() - Date.now()),
      expiresAt: Date.parse(request.expiresAt),
    });
  }
}

// Covers the whole unalerted burst, including mentions that arrived before an out-of-order event.
function nextWindow(
  request: ConversationAlert,
  previous: NotificationWindow | undefined,
  latestSeq: bigint,
): ConversationAlert {
  if (previous?.id === request.id) return withWindow(request, previous);

  const firstSeq = previous ? previous.lastSeq + 1n : 1n;

  return { ...request, firstSeq: firstSeq.toString(), lastSeq: latestSeq.toString() };
}

function withWindow(alert: ConversationAlert, window: NotificationWindow): ConversationAlert {
  return {
    ...alert,
    firstSeq: window.firstSeq.toString(),
    lastSeq: window.lastSeq.toString(),
    expiresAt: window.expiresAt.toISOString(),
  };
}
