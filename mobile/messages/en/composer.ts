import type { Translation } from '../translation';
import type { composer as source } from '../uk/composer';

export const composer = {
  tabs: {
    gif: 'GIF',
    stickers: 'Stickers',
    emoji: 'Emoji',
  },
  gif: {
    unavailable: 'GIF search is unavailable right now.',
    searchPlaceholder: 'Search KLIPY',
    search: 'Search GIFs',
    error: 'Couldn’t load GIFs. Try again.',
    empty: 'Nothing found.',
  },
  emoji: {
    search: 'Search emoji',
    empty: 'Nothing found.',
  },
  stickers: {
    soon: 'Sticker packs are coming soon.',
  },
  categories: {
    frequent: 'Frequently used',
    people: 'Smileys & people',
    nature: 'Animals & nature',
    foods: 'Food & drink',
    activity: 'Activities',
    places: 'Travel & places',
    objects: 'Objects',
    symbols: 'Symbols',
    flags: 'Flags',
  },
} satisfies Translation<typeof source>;
