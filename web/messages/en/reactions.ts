import type { Translation } from '../translation';
import type { reactions as source } from '../uk/reactions';

export const reactions = {
  total_one: '{{count}} reaction',
  total_other: '{{count}} reactions',
  yourReaction: '{{emoji}} {{amount}}, your reaction',
  reaction: 'React with {{emoji}}',
  toolbar: 'Reactions',
  more: 'More reactions',
  picker: 'Choose a reaction',
  all: 'All {{total}}',
  nameUnavailable: 'Name unavailable',
  loadFailed: 'Couldn’t load the list.',
  andMore: 'and {{amount}} more',
  errors: {
    tooMany: 'There are too many different reactions here already.',
    toggle: 'Couldn’t change the reaction.',
  },
} satisfies Translation<typeof source>;
