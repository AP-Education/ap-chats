export type StoredOutboxEvent = {
  id: string;
  name: string;
  payload: object;
  priority: number;
  expiresAt: Date;
};
export type NewOutboxEvent = Omit<StoredOutboxEvent, 'id'>;

export abstract class EventOutboxRepository {
  abstract append(event: NewOutboxEvent): Promise<void>;
  abstract claim(limit: number): Promise<StoredOutboxEvent[]>;
  abstract release(ids: string[]): Promise<void>;
  abstract acknowledge(id: string): Promise<void>;
  abstract purgeExpired(): Promise<void>;
}
