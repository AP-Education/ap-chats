import { Injectable, type OnModuleInit } from '@nestjs/common';

import { AppConfigService } from '@/globals/config';
import { JobQueue } from '@/globals/jobs/job-queue';
import { IntegrationEvents } from '@/globals/publisher/integration-events';

import { CallLifecycle } from './call-lifecycle';
import {
  CALL_SIGNAL_EVENT,
  type CallSignalEvent,
  type CallSignalPayload,
} from './events/call-signal.event';
import { RING_TTL_SECONDS } from './ring-endings';

const RING_EXPIRY_JOB = 'calls.ring-expiry';

/** Ends a ring nobody answered at its deadline, so no client has to keep asking for that. */
@Injectable()
export class RingExpiry implements OnModuleInit {
  constructor(
    private readonly events: IntegrationEvents,
    private readonly jobs: JobQueue,
    private readonly lifecycle: CallLifecycle,
    private readonly config: AppConfigService,
  ) {}

  onModuleInit(): void {
    if (!this.config.get('PUSH_WORKER_ENABLED')) return;

    this.events.subscribe<CallSignalEvent>(CALL_SIGNAL_EVENT, 'ring-expiry', (event) =>
      this.schedule(event),
    );
    this.jobs.work<CallSignalPayload>(RING_EXPIRY_JOB, (ring) => this.lifecycle.expire(ring));
  }

  async schedule({ kind, payload: ring }: CallSignalEvent): Promise<void> {
    if (kind !== 'call:incoming') return;
    const startedAt = Date.parse(ring.startedAt);
    // Rung by a build from before rings carried their start; the next poll still sweeps it.
    if (Number.isNaN(startedAt)) return;

    const deadline = startedAt + RING_TTL_SECONDS * 1000;
    await this.jobs.enqueue(RING_EXPIRY_JOB, ring, {
      id: `ring-expiry:${ring.callId}`,
      delay: Math.max(0, deadline - Date.now()),
      attempts: 4,
      backoff: { type: 'exponential', delay: 1000 },
    });
  }
}
