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
import { JobQueue } from '@/globals/jobs/job-queue';
import { IntegrationEvents } from '@/globals/publisher/integration-events';

import { NotificationRequests } from '../delivery/notification-requests';
import type { ConversationAlert } from '../delivery/types';
import { NotificationPolicyService } from '../policy';
import { PushAudienceRepository, type PushRecipient } from './repository/push-audience.repository';
import { type MessageFanoutJob, type MessageNotificationSource, PUSH_FANOUT_QUEUE } from './types';

const FANOUT_PAGE_SIZE = 100;
const ALERT_LIFETIME_MS = 3600_000;

/** Decides who should hear about new messages, page by page, and hands them to delivery. */
@Injectable()
export class ConversationAlertScheduler implements OnModuleInit {
  constructor(
    private readonly events: IntegrationEvents,
    private readonly jobs: JobQueue,
    private readonly audience: PushAudienceRepository,
    private readonly policy: NotificationPolicyService,
    private readonly requests: NotificationRequests,
    private readonly config: AppConfigService,
  ) {}

  onModuleInit(): void {
    if (!this.config.get('PUSH_ENABLED') || !this.config.get('PUSH_WORKER_ENABLED')) return;

    this.events.subscribe<MessageCreatedEvent>(MESSAGE_CREATED_EVENT, 'push', (event) =>
      this.schedule({ source: newMessages(event, event.seq, event.seq) }),
    );
    this.events.subscribe<ForwardBatchCreatedEvent>(FORWARD_BATCH_CREATED_EVENT, 'push', (event) =>
      this.schedule({ source: newMessages(event, event.firstSeq, event.lastSeq) }),
    );
    this.jobs.work<MessageFanoutJob>(PUSH_FANOUT_QUEUE, (job) => this.schedule(job));
  }

  async schedule({ source, after }: MessageFanoutJob): Promise<void> {
    const context = await this.audience.context(source);
    const createdAt = await this.audience.lastCreatedAt(source);
    if (!context || !createdAt) return;

    const expiresAt = createdAt.getTime() + ALERT_LIFETIME_MS;
    if (expiresAt <= Date.now()) return;

    const page = await this.audience.recipients(source, after);
    const alerts = page
      .filter((recipient) => this.wantsAlert(source, recipient))
      .map((recipient) => alertFor(source, recipient, expiresAt));

    await this.requests.requestConversationAlerts(alerts);

    const hasNextPage = page.length === FANOUT_PAGE_SIZE;
    if (hasNextPage) await this.scheduleNextPage(source, page.at(-1)!.memberId, expiresAt);
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
}

function newMessages(
  event: Pick<MessageCreatedEvent, 'workspaceId' | 'channelId' | 'actorMemberId'>,
  firstSeq: string,
  lastSeq: string,
): MessageNotificationSource {
  const { workspaceId, channelId, actorMemberId } = event;

  return { workspaceId, channelId, actorMemberId, firstSeq, lastSeq };
}

function alertFor(
  source: MessageNotificationSource,
  recipient: PushRecipient,
  expiresAt: number,
): ConversationAlert {
  return {
    id: jobId(
      `alert:${source.channelId}:${source.firstSeq}:${source.lastSeq}:${recipient.memberId}`,
    ),
    workspaceId: source.workspaceId,
    channelId: source.channelId,
    firstSeq: source.firstSeq,
    lastSeq: source.lastSeq,
    userId: recipient.userId,
    memberId: recipient.memberId,
    expiresAt: new Date(expiresAt).toISOString(),
  };
}
