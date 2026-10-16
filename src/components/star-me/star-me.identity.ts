import type { MemberAppearance } from '@/components/workspaces/members/types';

export interface BotIdentity extends Omit<MemberAppearance, 'isBot'> {
  /** The reserved subject a bot's profile is found by, in place of an OIDC one. */
  subject: string;
}

/** The built-in assistant every workspace has: a bot member that answers when asked. */
export const STAR_ME: BotIdentity = {
  subject: 'bot:star-me',
  displayName: 'StarMe',
  // Built-in artwork the clients draw themselves, not a stored picture.
  avatarPath: 'builtin:ai-spark',
};
