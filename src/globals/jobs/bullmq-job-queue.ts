import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { Queue, type RedisOptions, UnrecoverableError, Worker } from 'bullmq';

import { AppConfigService } from '@/globals/config';
import { Logger } from '@/globals/logger';

import {
  type JobOptions,
  JobQueue,
  type JobRequest,
  PermanentJobError,
  type WorkerOptions,
} from './job-queue';

@Injectable()
export class BullMqJobQueue extends JobQueue implements OnModuleDestroy {
  private readonly queues = new Map<string, Queue>();
  private readonly workers: Worker[] = [];
  private readonly connection: RedisOptions;

  constructor(
    config: AppConfigService,
    private readonly logger: Logger,
  ) {
    super();
    const url = new URL(config.get('VALKEY_URL'));
    this.connection = {
      host: url.hostname,
      port: Number(url.port || 6379),
      username: decodeURIComponent(url.username) || undefined,
      password: decodeURIComponent(url.password) || undefined,
      db: Number(url.pathname.slice(1) || 0),
      ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
    };
  }

  private queue(name: string): Queue {
    let queue = this.queues.get(name);
    if (!queue) {
      queue = new Queue(name, {
        prefix: 'ap-connect',
        connection: {
          ...this.connection,
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
          connectTimeout: 5000,
          commandTimeout: 5000,
        },
        defaultJobOptions: {
          attempts: 8,
          backoff: { type: 'exponential', delay: 5000, jitter: 0.5 },
          removeOnComplete: { age: 7 * 86400, count: 10000 },
          removeOnFail: { age: 14 * 86400, count: 10000 },
        },
      });
      queue.on('error', (err) => this.logger.error({ err, queue: name }, 'Queue error'));
      this.queues.set(name, queue);
    }
    return queue;
  }

  async enqueue<T extends object>(name: string, data: T, options: JobOptions = {}): Promise<void> {
    await this.enqueueMany(name, [{ data, options }]);
  }

  async enqueueMany<T extends object>(name: string, jobs: JobRequest<T>[]): Promise<void> {
    if (!jobs.length) return;

    await this.queue(name).addBulk(
      jobs.map(({ data, options = {} }) => {
        const { id, expiresAt, backoff, ...queueOptions } = options;

        return {
          name,
          data: { payload: data, expiresAt },
          opts: {
            ...queueOptions,
            ...(id ? { jobId: id } : {}),
            ...(backoff ? { backoff: { ...backoff, jitter: 0.5 } } : {}),
          },
        };
      }),
    );
  }

  work<T extends object>(
    name: string,
    handle: (data: T, id: string) => Promise<void>,
    options: WorkerOptions = {},
  ): void {
    const worker = new Worker<{ payload: T; expiresAt?: number }>(
      name,
      async (job) => {
        if (job.data.expiresAt !== undefined && job.data.expiresAt <= Date.now()) return;

        try {
          await handle(job.data.payload, job.id!);
        } catch (error) {
          if (error instanceof PermanentJobError) throw new UnrecoverableError(error.message);
          throw error;
        }
      },
      {
        prefix: 'ap-connect',
        connection: { ...this.connection, maxRetriesPerRequest: null },
        concurrency: options.concurrency ?? 1,
        ...(options.rateLimit ? { limiter: options.rateLimit } : {}),
      },
    );
    worker.on('error', (err) => this.logger.error({ err, queue: name }, 'Worker error'));
    // Only a job that has run out of attempts is an error; earlier failures are its retries working.
    worker.on('failed', (job, err) => {
      const isFinal =
        err instanceof UnrecoverableError || (job?.attemptsMade ?? 0) >= (job?.opts.attempts ?? 1);
      const fields = { err, queue: name, jobId: job?.id, attempt: job?.attemptsMade };

      if (isFinal) this.logger.error(fields, 'Job failed');
      else this.logger.warn(fields, 'Job attempt failed, retrying');
    });
    this.workers.push(worker);
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(this.workers.map((worker) => worker.close()));
    await Promise.all([...this.queues.values()].map((queue) => queue.close()));
  }
}
