/** Publishes what a committed transaction changed. */
export type Announce = () => void;

export interface RecordOptions {
  durable?: boolean;
  /** Outbox ordering for a durable event; lower goes first. */
  priority?: number;
  /** How long a durable event stays worth delivering. */
  expireInSeconds?: number;
}
