import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';

import { EventPublisher } from '@/globals/publisher';
import type { Announce } from '@/globals/publisher/types';

import { RING_ENDED_EVENT, RingEndedEvent, type RingEndReason } from './events/ring-ended.event';
import { RingAudience } from './ring-audience';
import type { CallRecord } from './types';

// How long a call may ring before it reads as missed, same order of magnitude as a phone ring.
export const RING_TTL_SECONDS = 45;

/** Kept durable, so a device ringing with no app running still hears the ring is over. */
@Injectable()
export class RingEndings {
  constructor(
    private readonly audience: RingAudience,
    private readonly events: EventPublisher,
  ) {}

  /** Everyone the call rang, unless the ring only stops on some of them. */
  @Transactional()
  async record(call: CallRecord, reason: RingEndReason, onlyUserIds?: string[]): Promise<Announce> {
    const recipients =
      onlyUserIds ?? (await this.audience.of(call.channelId, call.startedByMemberId));

    return this.events.record(RING_ENDED_EVENT, new RingEndedEvent(call.id, reason, recipients), {
      durable: true,
      expireInSeconds: RING_TTL_SECONDS,
      priority: 1,
    });
  }
}
