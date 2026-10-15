import type { Announce, RecordOptions } from './types';

export const nothingToAnnounce: Announce = () => {};

export abstract class EventPublisher {
  /** Tells this process's listeners about a change that has already committed. */
  abstract publish<T extends object>(name: string, event: T): void;

  /**
   * Inside the transaction; run the returned announcement after it commits. A durable event also
   * goes to the outbox in that transaction, so other processes get it even if this one dies.
   */
  abstract record<T extends object>(
    name: string,
    event: T,
    options?: RecordOptions,
  ): Promise<Announce>;
}
