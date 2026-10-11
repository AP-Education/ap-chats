import type { Icon } from '@phosphor-icons/react';

import type { MentionToken } from '../../mention-tokens';

/** What was typed after a trigger, up to the caret. */
export interface SuggestionQuery {
  trigger: '@' | '#';
  text: string;
}

/** One row of the popup; picking it inserts its token. */
export interface Suggestion {
  key: string;
  token: MentionToken;
  /** Shown in the row, matched against the query and kept as the chip's label. */
  label: string;
  visual: { avatarPath: string | null } | { icon: Icon };
  hint?: string;
}

/** Everything one trigger offers, with how its popup is announced. */
export interface SuggestionGroup {
  heading: string;
  ariaLabel: string;
  items: Suggestion[];
}
