import { Injectable, type OnModuleInit } from '@nestjs/common';

import { PushTargetsService } from '@/components/devices';
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

import { NotificationPolicyService } from '../policy';
import { MessageDeliveryRegistry } from './delivery';
import { MessageNotificationContentService } from './message-notification-content.service';
import { NotificationWindowsRepository } from './repository/notification-windows.repository';
import { PushAudienceRepository } from './repository/push-audience.repository';
import {
  type ConversationAlert,
  type MessageDeliveryJob,
  type MessageFanoutJob,
  PUSH_BATCH_READY_EVENT,
  PUSH_FANOUT_EVENT,
} from './types';

@Injectable()
export class ConversationNotificationWorker implements OnModuleInit {
  constructor(
    private readonly jobs: JobQueue,
    private readonly audience: PushAudienceRepository,
    private readonly policy: NotificationPolicyService,
    private readonly windows: NotificationWindowsRepository,
    private readonly config: AppConfigService,
    private readonly targets: PushTargetsService,
    private readonly deliveries: MessageDeliveryRegistry,
    private readonly content: MessageNotificationContentService,
  ) {}

  onModuleInit(): void {
    if (!this.config.get('PUSH_ENABLED') || !this.config.get('PUSH_WORKER_ENABLED')) return;

    this.jobs.work<MessageCreatedEvent>(MESSAGE_CREATED_EVENT, (event) =>
      this.scheduleConversationAlerts({
        source: {
          workspaceId: event.workspaceId,
          channelId: event.channelId,
          actorMemberId: event.actorMemberId,
          firstSeq: event.seq,
          lastSeq: event.seq,
        },
      }),
    );
    this.jobs.work<ForwardBatchCreatedEvent>(FORWARD_BATCH_CREATED_EVENT, (event) =>
      this.scheduleConversationAlerts({
        source: {
          workspaceId: event.workspaceId,
          channelId: event.channelId,
          actorMemberId: event.actorMemberId,
          firstSeq: event.firstSeq,
          lastSeq: event.lastSeq,
        },
      }),
    );
    this.jobs.work<MessageFanoutJob>(PUSH_FANOUT_EVENT, (job) =>
      this.scheduleConversationAlerts(job),
    );
    this.jobs.work<ConversationAlert>(PUSH_BATCH_READY_EVENT, (alert) =>
      this.dispatchConversationAlert(alert),
    );
  }

  async scheduleConversationAlerts({ source, after }: MessageFanoutJob): Promise<void> {
    const context = await this.audience.context(source);
    const createdAt = await this.audience.lastCreatedAt(source);
    if (!context || !createdAt) return;

    const expiresAt = createdAt.getTime() + 3600000;
    if (expiresAt <= Date.now()) return;

    const page = await this.audience.recipients(source, after);
    const delay = this.config.get('PUSH_COALESCE_SECONDS') * 1000;
    const alerts: JobRequest<ConversationAlert>[] = [];

    for (const recipient of page) {
      if (
        !this.policy.shouldAlert({
          kind: 'message.created',
          actorMemberId: source.actorMemberId,
          recipientMemberId: recipient.memberId,
          channelKind: context.kind,
          settings: recipient,
          mentioned: recipient.mentioned,
        })
      )
        continue;

      const id = jobId(
        `alert:${source.channelId}:${source.firstSeq}:${source.lastSeq}:${recipient.memberId}`,
      );
      alerts.push({
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
          delay,
          expiresAt,
          deduplication: { id: jobId(`${recipient.userId}:${source.channelId}`), ttl: delay },
        },
      });
    }

    await this.jobs.enqueueMany(PUSH_BATCH_READY_EVENT, alerts);

    if (page.length === 100) {
      const next = page.at(-1)!.memberId;
      await this.jobs.enqueue(
        PUSH_FANOUT_EVENT,
        { source, after: next },
        {
          id: jobId(`fanout:${source.channelId}:${source.firstSeq}:${source.lastSeq}:${next}`),
          expiresAt,
        },
      );
    }
  }

  async dispatchConversationAlert(request: ConversationAlert): Promise<void> {
    if (Date.parse(request.expiresAt) <= Date.now()) return;

    const previous = await this.windows.latest(request.userId, request.channelId);
    if (previous && previous.id !== request.id && previous.lastSeq >= BigInt(request.lastSeq))
      return;

    const context = await this.audience.context(request);
    if (!context) return;

    // Include the entire collected burst, including mentions before an out-of-order source event.
    let candidate: ConversationAlert;
    if (previous?.id === request.id) {
      candidate = {
        ...request,
        firstSeq: previous.firstSeq.toString(),
        lastSeq: previous.lastSeq.toString(),
        expiresAt: previous.expiresAt.toISOString(),
      };
    } else {
      candidate = {
        ...request,
        firstSeq: (previous ? previous.lastSeq + 1n : 1n).toString(),
        lastSeq: context.lastSeq.toString(),
      };
    }

    if (!(await this.content.findEligibleMessage(candidate))) return;

    const targets = await this.targets.listMessageTargetsForUser(
      request.userId,
      this.deliveries.browserEnabled,
    );
    if (!targets.length) return;

    const reservation = await this.windows.reserve(
      candidate,
      new Date(),
      this.config.get('PUSH_COOLDOWN_SECONDS'),
      this.config.get('PUSH_USER_ALERTS_PER_MINUTE'),
    );
    if (!reservation) return;

    const alert = {
      ...candidate,
      firstSeq: reservation.firstSeq.toString(),
      lastSeq: reservation.lastSeq.toString(),
      expiresAt: reservation.expiresAt.toISOString(),
    };

    // Retry the same reservation after an enqueue failure; stable child IDs prevent duplicate jobs.
    for (const target of targets) {
      await this.jobs.enqueue<MessageDeliveryJob>(
        this.deliveries.resolve(target.kind).queueName,
        { alert, target },
        {
          id: jobId(`${alert.id}:${target.kind}:${target.id}:${target.fingerprint}`),
          expiresAt: reservation.expiresAt.getTime(),
        },
      );
    }
  }
}
