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
import { IntegrationEvents } from '@/globals/publisher/integration-events';

import { NotificationRequests } from '../delivery/notification-requests';
import { NotificationPolicyService } from '../policy';
import { ConversationWindows } from './conversation-windows';
import {
  PushAudienceRepository,
  type PushRecipient,
  RECIPIENTS_PAGE_SIZE,
} from './repository/push-audience.repository';
import type {
  ConversationAlert,
  ConversationRange,
  ConversationWindow,
  MessageFanoutJob,
} from './types';

// Messages older than this are no longer worth an interruption.
const ALERT_LIFETIME_MS = 3600_000;

/** Decides who hears about a conversation's new messages once its window closes. */
@Injectable()
export class ConversationAlertScheduler implements OnModuleInit {
  constructor(
    private readonly events: IntegrationEvents,
    private readonly windows: ConversationWindows,
    private readonly audience: PushAudienceRepository,
    private readonly policy: NotificationPolicyService,
    private readonly requests: NotificationRequests,
    private readonly config: AppConfigService,
  ) {}

  onModuleInit(): void {
    if (!this.config.runsPushWorkers()) return;

    this.events.subscribe<MessageCreatedEvent>(MESSAGE_CREATED_EVENT, 'push', (event) =>
      this.windows.open(windowFrom(event, event.seq)),
    );
    this.events.subscribe<ForwardBatchCreatedEvent>(FORWARD_BATCH_CREATED_EVENT, 'push', (event) =>
      this.windows.open(windowFrom(event, event.firstSeq)),
    );
    this.windows.whenClosed((fanout) => this.alertRecipients(fanout));
  }

  async alertRecipients({ window, lastSeq, after }: MessageFanoutJob): Promise<void> {
    const conversation = await this.audience.conversation(window);
    if (!conversation) return;

    // Pinned on the first page, so every page of one fanout covers the same messages.
    const range = { ...window, lastSeq: lastSeq ?? conversation.lastSeq.toString() };
    const expiresAt = await this.alertDeadline(range);
    if (!expiresAt) return;

    const page = await this.audience.recipients(range, after);
    const alerts = page
      .filter((recipient) => this.policy.wantsMessages(recipient, recipient.mentioned))
      .map((recipient) => alertFor(range, recipient, expiresAt));

    await this.requests.request(alerts);

    const hasNextPage = page.length === RECIPIENTS_PAGE_SIZE;
    if (hasNextPage) await this.windows.continueAfter(range, page.at(-1)!.memberId);
  }

  private async alertDeadline(range: ConversationRange): Promise<number | null> {
    const latestMessageAt = await this.audience.latestMessageAt(range);
    if (!latestMessageAt) return null;

    const deadline = latestMessageAt.getTime() + ALERT_LIFETIME_MS;
    return deadline > Date.now() ? deadline : null;
  }
}

function windowFrom(
  event: Pick<MessageCreatedEvent, 'workspaceId' | 'channelId'>,
  firstSeq: string,
): ConversationWindow {
  return { workspaceId: event.workspaceId, channelId: event.channelId, firstSeq };
}

function alertFor(
  range: ConversationRange,
  recipient: PushRecipient,
  expiresAt: number,
): ConversationAlert {
  return {
    id: `alert:${range.channelId}:${range.firstSeq}:${range.lastSeq}:${recipient.memberId}`,
    workspaceId: range.workspaceId,
    channelId: range.channelId,
    firstSeq: range.firstSeq,
    lastSeq: range.lastSeq,
    userId: recipient.userId,
    memberId: recipient.memberId,
    expiresAt: new Date(expiresAt).toISOString(),
  };
}
