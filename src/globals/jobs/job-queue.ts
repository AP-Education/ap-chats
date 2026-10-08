/** A failure no retry can fix: the job fails at once instead of exhausting its attempts. */
export class PermanentJobError extends Error {}

export interface JobOptions {
  /** Any stable key; a repeated key adds no second job. */
  id?: string;
  priority?: number;
  attempts?: number;
  backoff?: { type: 'fixed' | 'exponential'; delay: number };
  delay?: number;
  expiresAt?: number;
  deduplication?: { id: string; ttl: number };
}
export interface WorkerOptions {
  concurrency?: number;
  rateLimit?: { max: number; duration: number };
}

export interface JobRequest<T extends object> {
  data: T;
  options?: JobOptions;
}

export abstract class JobQueue {
  abstract enqueue<T extends object>(name: string, data: T, options?: JobOptions): Promise<void>;
  abstract enqueueMany<T extends object>(name: string, jobs: JobRequest<T>[]): Promise<void>;
  abstract work<T extends object>(
    name: string,
    handle: (data: T, id: string) => Promise<void>,
    options?: WorkerOptions,
  ): void;
}
