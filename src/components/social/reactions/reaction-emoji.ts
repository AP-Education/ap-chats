// One fully qualified emoji from the Unicode RGI set, so each reaction has a single spelling.
const REACTION_EMOJI = new RegExp('^\\p{RGI_Emoji}$', 'v');

export const MAX_DISTINCT_REACTIONS = 20;

export function isReactionEmoji(value: string): boolean {
  return REACTION_EMOJI.test(value);
}
