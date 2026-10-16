import type {
  NewScheduledMessage,
  ScheduledMessageChange,
  ScheduledMessageModel,
} from '../types/scheduled-message.types';

export abstract class ScheduledMessagesRepository {
  /** Soonest first. */
  abstract listOwn(channelId: string, authorMemberId: string): Promise<ScheduledMessageModel[]>;
  abstract countOwn(channelId: string, authorMemberId: string): Promise<number>;
  abstract findByNonce(
    channelId: string,
    authorMemberId: string,
    clientNonce: string,
  ): Promise<ScheduledMessageModel | null>;
  /** Waits for whoever holds the row: a delivery in progress either sends it or leaves it be. */
  abstract lockOwn(
    channelId: string,
    authorMemberId: string,
    id: string,
  ): Promise<ScheduledMessageModel | null>;
  /** Oldest first; a row that failed waits for its author instead. */
  abstract due(limit: number): Promise<ScheduledMessageModel[]>;
  /** Skips a row someone else holds: another instance delivering it, or its author changing it. */
  abstract lockDue(id: string): Promise<ScheduledMessageModel | null>;
  abstract insert(data: NewScheduledMessage): Promise<ScheduledMessageModel>;
  abstract update(
    id: string,
    change: ScheduledMessageChange,
    nextRevision: number,
  ): Promise<ScheduledMessageModel>;
  abstract markFailed(id: string, failure: string): Promise<void>;
  abstract remove(id: string): Promise<void>;
}
