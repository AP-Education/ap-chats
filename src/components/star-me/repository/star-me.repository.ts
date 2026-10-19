import type { BotIdentity } from '../star-me.identity';
import type { ConversationMessage, Question } from '../types';

export abstract class StarMeRepository {
  /** Creates the bot's profile, or brings its name and picture up to date. */
  abstract saveIdentity(identity: BotIdentity): Promise<void>;

  /** Adds the bot to the workspace, or to every workspace; one that removed it keeps it removed. */
  abstract enrol(identity: BotIdentity, workspaceId?: string): Promise<void>;

  /** A live message the member wrote in the channel, and how it reaches StarMe. */
  abstract question(
    askedByMemberId: string,
    channelId: string,
    messageId: string,
    starMeMemberId: string,
  ): Promise<Question | undefined>;

  /** StarMe's message sent with this nonce in the channel, if it has answered already. */
  abstract answerId(
    channelId: string,
    starMeMemberId: string,
    clientNonce: string,
  ): Promise<string | undefined>;

  /** The channel's last live messages up to and including `seq`, oldest first. */
  abstract recent(channelId: string, seq: bigint, limit: number): Promise<ConversationMessage[]>;

  /** The listed live messages of the channel, oldest first. */
  abstract selected(channelId: string, messageIds: string[]): Promise<ConversationMessage[]>;

  /** The live messages the question is about, oldest first. */
  abstract context(channelId: string, questionId: string): Promise<ConversationMessage[]>;
}
