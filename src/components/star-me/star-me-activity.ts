import { Injectable } from '@nestjs/common';

import type { StarMeStatusEvent } from './events/star-me-status.event';

// Long enough to come back to a failed question and ask again.
const FAILURE_KEPT_MS = 60 * 60_000;

interface OpenQuestion {
  status: StarMeStatusEvent;
  at: number;
}

/**
 * The questions StarMe is answering or could not answer, for whoever opens their channel late.
 * A run lives in this process, so its status does too: a restart ends both.
 */
@Injectable()
export class StarMeActivity {
  private readonly open = new Map<string, OpenQuestion>();

  record(status: StarMeStatusEvent): void {
    this.forgetOldFailures();

    if (status.state === 'answered') this.open.delete(status.questionId);
    else this.open.set(status.questionId, { status, at: Date.now() });
  }

  isThinking(questionId: string): boolean {
    return this.open.get(questionId)?.status.state === 'thinking';
  }

  inChannel(channelId: string): StarMeStatusEvent[] {
    return [...this.open.values()]
      .map(({ status }) => status)
      .filter((status) => status.channelId === channelId);
  }

  private forgetOldFailures(): void {
    const cutoff = Date.now() - FAILURE_KEPT_MS;
    for (const [questionId, { status, at }] of this.open) {
      if (status.state === 'failed' && at < cutoff) this.open.delete(questionId);
    }
  }
}
