import { Injectable, type OnModuleInit } from '@nestjs/common';

import {
  FORWARD_BATCH_CREATED_EVENT,
  type ForwardBatchCreatedEvent,
} from '@/components/social/forwarding/events/forward-batch-created.event';
import {
  MESSAGE_CREATED_EVENT,
  type MessageCreatedEvent,
} from '@/components/social/messages/events/message-created.event';
import { AppConfigService } from '@/globals/config';
import { jobId } from '@/globals/jobs/job-id';
import { JobQueue, type JobRequest } from '@/globals/jobs/job-queue';
import { IntegrationEvents } from '@/globals/publisher/integration-events';

import { NotificationPolicyService } from '../policy';
import { NotificationChannelRegistry } from './channels/notification-channel.registry';
import { MessageNotificationContentService } from './message-notification-content.service';
import { NotificationWindowsRepository } from './repository/notification-windows.repository';
import {
  PushAudienceRepository,
  type PushContext,
  type PushRecipient,
} from './repository/push-audience.repository';
import {
  type ConversationAlert,
  type MessageDeliveryJob,
  type MessageFanoutJob,
  type MessageNotificationSource,
  type NotificationWindow,
  PUSH_ALERT_DUE_QUEUE,
  PUSH_FANOUT_QUEUE,
} from './types';

const FANOUT_PAGE_SIZE = 100;
const ALERT_LIFETIME_MS = 3600_000;

@Injectable()
export class ConversationNotificationWorker implements OnModuleInit {
  constructor(
    private readonly events: IntegrationEvents,
    private readonly jobs: JobQueue,
    private readonly audience: PushAudienceRepository,
    private readonly policy: NotificationPolicyService,
    private readonly windows: NotificationWindowsRepository,
    private readonly config: AppConfigService,
    private readonly channels: NotificationChannelRegistry,
    private readonly content: MessageNotificationContentService,
  ) {}

  onModuleInit(): void {
    if (!this.config.get('PUSH_ENABLED') || !this.config.get('PUSH_WORKER_ENABLED')) return;

    this.events.subscribe<MessageCreatedEvent>(MESSAGE_CREATED_EVENT, 'push', (event) =>
      this.scheduleConversationAlerts({ source: newMessages(event, event.seq, event.seq) }),
    );
    this.events.subscribe<ForwardBatchCreatedEvent>(FORWARD_BATCH_CREATED_EVENT, 'push', (event) =>
      this.scheduleConversationAlerts({
        source: newMessages(event, event.firstSeq, event.lastSeq),
      }),
    );
    this.jobs.work<MessageFanoutJob>(PUSH_FANOUT_QUEUE, (job) =>
      this.scheduleConversationAlerts(job),
    );
    this.jobs.work<ConversationAlert>(PUSH_ALERT_DUE_QUEUE, (alert) =>
      this.dispatchConversationAlert(alert),
    );
  }

  async scheduleConversationAlerts({ source, after }: MessageFanoutJob): Promise<void> {
    const context = await this.audience.context(source);
    const createdAt = await this.audience.lastCreatedAt(source);
    if (!context || !createdAt) return;

    const expiresAt = createdAt.getTime() + ALERT_LIFETIME_MS;
    if (expiresAt <= Date.now()) return;

    const page = await this.audience.recipients(source, after);
    const alerts = page
      .filter((recipient) => this.wantsAlert(source, recipient))
      .map((recipient) => this.alertRequest(source, recipient, expiresAt));

    await this.jobs.enqueueMany(PUSH_ALERT_DUE_QUEUE, alerts);

    const hasNextPage = page.length === FANOUT_PAGE_SIZE;
    if (hasNextPage) await this.scheduleNextPage(source, page.at(-1)!.memberId, expiresAt);
  }

  async dispatchConversationAlert(request: ConversationAlert): Promise<void> {
    const previous = await this.windows.latest(request.userId, request.channelId);
    const isCovered =
      previous && previous.id !== request.id && previous.lastSeq >= BigInt(request.lastSeq);
    if (isCovered) return;

    const context = await this.audience.context(request);
    if (!context) return;

    const candidate = nextWindow(request, previous, context);
    const eligible = await this.content.findEligibleMessage(candidate);
    if (!eligible) return;

    const targets = await this.channels.listTargets(request.userId);
    if (!targets.length) return;

    const reservation = await this.windows.reserve(candidate, new Date(), {
      cooldownSeconds: this.config.get('PUSH_COOLDOWN_SECONDS'),
      userAlertsPerMinute: this.config.get('PUSH_USER_ALERTS_PER_MINUTE'),
      urgent: eligible.urgent,
    });
    if (reservation.status === 'superseded') return;
    if (reservation.status === 'deferred') return this.deferAlert(request, reservation.until);

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

  private wantsAlert(source: MessageNotificationSource, recipient: PushRecipient): boolean {
    return this.policy.shouldAlert({
      kind: 'message.created',
      actorMemberId: source.actorMemberId,
      recipientMemberId: recipient.memberId,
      settings: recipient,
      mentioned: recipient.mentioned,
    });
  }

  // Coalesced per person and conversation: a burst of messages waits a moment and becomes one alert.
  private alertRequest(
    source: MessageNotificationSource,
    recipient: PushRecipient,
    expiresAt: number,
  ): JobRequest<ConversationAlert> {
    const id = jobId(
      `alert:${source.channelId}:${source.firstSeq}:${source.lastSeq}:${recipient.memberId}`,
    );
    const coalesceMs = this.config.get('PUSH_COALESCE_SECONDS') * 1000;

    return {
      data: {
        id,
        workspaceId: source.workspaceId,
        channelId: source.channelId,
        firstSeq: source.firstSeq,
        lastSeq: source.lastSeq,
        userId: recipient.userId,
        memberId: recipient.memberId,
        expiresAt: new Date(expiresAt).toISOString(),
      },
      options: {
        id,
        delay: coalesceMs,
        expiresAt,
        deduplication: { id: jobId(`${recipient.userId}:${source.channelId}`), ttl: coalesceMs },
      },
    };
  }

  private async scheduleNextPage(
    source: MessageNotificationSource,
    after: string,
    expiresAt: number,
  ): Promise<void> {
    await this.jobs.enqueue<MessageFanoutJob>(
      PUSH_FANOUT_QUEUE,
      { source, after },
      {
        id: jobId(`fanout:${source.channelId}:${source.firstSeq}:${source.lastSeq}:${after}`),
        expiresAt,
      },
    );
  }

  // A throttled alert waits for its window instead of being dropped; the rerun covers every message since.
  private async deferAlert(request: ConversationAlert, until: Date): Promise<void> {
    await this.jobs.enqueue(PUSH_ALERT_DUE_QUEUE, request, {
      id: jobId(`${request.id}:deferred:${until.getTime()}`),
      delay: Math.max(0, until.getTime() - Date.now()),
      expiresAt: Date.parse(request.expiresAt),
    });
  }
}

function newMessages(
  event: Pick<MessageCreatedEvent, 'workspaceId' | 'channelId' | 'actorMemberId'>,
  firstSeq: string,
  lastSeq: string,
): MessageNotificationSource {
  const { workspaceId, channelId, actorMemberId } = event;

  return { workspaceId, channelId, actorMemberId, firstSeq, lastSeq };
}

// Covers the whole unalerted burst, including mentions that arrived before an out-of-order event.
function nextWindow(
  request: ConversationAlert,
  previous: NotificationWindow | undefined,
  context: PushContext,
): ConversationAlert {
  if (previous?.id === request.id) return withWindow(request, previous);

  const firstSeq = previous ? previous.lastSeq + 1n : 1n;

  return { ...request, firstSeq: firstSeq.toString(), lastSeq: context.lastSeq.toString() };
}

function withWindow(alert: ConversationAlert, window: NotificationWindow): ConversationAlert {
  return {
    ...alert,
    firstSeq: window.firstSeq.toString(),
    lastSeq: window.lastSeq.toString(),
    expiresAt: window.expiresAt.toISOString(),
  };
}
