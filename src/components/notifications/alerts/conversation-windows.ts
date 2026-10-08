import { Injectable } from '@nestjs/common';

import { AppConfigService } from '@/globals/config';
import { JobQueue } from '@/globals/jobs/job-queue';

import type { ConversationRange, ConversationWindow, MessageFanoutJob } from './types';

const FANOUT_QUEUE = 'push.message-fanout';

/** Holds a conversation's burst of new messages for a moment, then hands it on a page at a time. */
@Injectable()
export class ConversationWindows {
  constructor(
    private readonly jobs: JobQueue,
    private readonly config: AppConfigService,
  ) {}

  // Messages after the first one in a window are dropped: its fanout reads the channel as it is by then.
  async open(window: ConversationWindow): Promise<void> {
    const windowMs = this.config.get('PUSH_COALESCE_SECONDS') * 1000;

    await this.jobs.enqueue<MessageFanoutJob>(
      FANOUT_QUEUE,
      { window },
      {
        id: `window:${window.channelId}:${window.firstSeq}`,
        delay: windowMs,
        deduplication: { id: `window:${window.channelId}`, ttl: windowMs },
      },
    );
  }

  async continueAfter(range: ConversationRange, memberId: string): Promise<void> {
    const { lastSeq, ...window } = range;

    await this.jobs.enqueue<MessageFanoutJob>(
      FANOUT_QUEUE,
      { window, lastSeq, after: memberId },
      { id: `fanout:${range.channelId}:${range.firstSeq}:${lastSeq}:${memberId}` },
    );
  }

  whenClosed(handle: (fanout: MessageFanoutJob) => Promise<void>): void {
    this.jobs.work<MessageFanoutJob>(FANOUT_QUEUE, handle);
  }
}
