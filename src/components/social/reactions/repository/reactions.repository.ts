import type { ReactedMessage, ReactionSummary, Reactor } from '../types/reaction.types';

export abstract class ReactionsRepository {
  abstract isLiveMessage(message: ReactedMessage): Promise<boolean>;
  abstract emojisOn(messageId: string): Promise<string[]>;
  /** False when the member already had this reaction. */
  abstract add(message: ReactedMessage, emoji: string, memberId: string): Promise<boolean>;
  /** False when the member had no such reaction. */
  abstract remove(messageId: string, emoji: string, memberId: string): Promise<boolean>;
  abstract summary(messageId: string, emoji: string): Promise<ReactionSummary>;
  /** The latest first, across every emoji unless one is given. */
  abstract reactors(
    messageId: string,
    filter: { emoji: string | undefined; limit: number },
  ): Promise<Reactor[]>;
}
