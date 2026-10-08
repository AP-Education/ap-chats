export interface OutboxOptions {
  priority?: number;
  expireInSeconds?: number;
}

export abstract class EventOutbox {
  abstract record<T extends object>(name: string, event: T, options?: OutboxOptions): Promise<void>;
}
