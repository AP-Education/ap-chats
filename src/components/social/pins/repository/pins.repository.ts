import type { MessagePin } from '../types/pin.types';

export abstract class PinsRepository {
  abstract list(channelId: string): Promise<MessagePin[]>;
  abstract find(channelId: string, messageId: string): Promise<MessagePin | null>;
  abstract messageIsAvailable(
    workspaceId: string,
    channelId: string,
    messageId: string,
  ): Promise<boolean>;
  abstract insert(
    workspaceId: string,
    channelId: string,
    messageId: string,
    actorMemberId: string,
  ): Promise<MessagePin>;
  abstract remove(channelId: string, messageId: string): Promise<boolean>;
  abstract removeForMessages(ids: string[]): Promise<void>;
}
