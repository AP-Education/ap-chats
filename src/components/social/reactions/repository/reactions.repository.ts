import type { ReactionState, Reactor } from '../types/reaction.types';

export abstract class ReactionsRepository {
  abstract messageIsAvailable(
    workspaceId: string,
    channelId: string,
    messageId: string,
  ): Promise<boolean>;
  abstract emojis(messageId: string): Promise<string[]>;
  /** False when the member already had this reaction. */
  abstract insert(
    workspaceId: string,
    channelId: string,
    messageId: string,
    emoji: string,
    memberId: string,
  ): Promise<boolean>;
  /** False when the member had no such reaction. */
  abstract remove(messageId: string, emoji: string, memberId: string): Promise<boolean>;
  abstract state(messageId: string, emoji: string): Promise<ReactionState>;
  /** The latest first, across every emoji unless one is given. */
  abstract reactors(
    messageId: string,
    emoji: string | undefined,
    limit: number,
  ): Promise<Reactor[]>;
}
