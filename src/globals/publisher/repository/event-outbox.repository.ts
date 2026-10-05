export type StoredOutboxEvent = {
  id: string;
  name: string;
  payload: object;
  priority: number;
  expiresAt: Date;
};
export type NewOutboxEvent = Omit<StoredOutboxEvent, 'id'> & { id?: string };

export abstract class EventOutboxRepository {
  abstract append(event: NewOutboxEvent): Promise<void>;
  abstract claim(): Promise<StoredOutboxEvent[]>;
  abstract release(ids: string[]): Promise<void>;
  abstract acknowledge(id: string): Promise<void>;
  abstract purge(): Promise<void>;
}
