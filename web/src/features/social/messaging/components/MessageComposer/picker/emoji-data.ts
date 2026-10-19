import type { EmojiMartData } from '@emoji-mart/data';
import rawData from '@emoji-mart/data';
import type { Icon } from '@phosphor-icons/react';
import {
  AirplaneIcon,
  FlagIcon,
  HamburgerIcon,
  HashIcon,
  LightbulbIcon,
  PawPrintIcon,
  SmileyIcon,
  SoccerBallIcon,
} from '@phosphor-icons/react';

const data = rawData as EmojiMartData;

export interface EmojiItem {
  id: string;
  native: string;
  name: string;
  keywords: string;
}

export interface EmojiCategory {
  id: EmojiCategoryId;
  icon: Icon;
  items: EmojiItem[];
}

export const FREQUENT_CATEGORY_ID = 'frequent';

const CATEGORY_META = {
  people: { icon: SmileyIcon },
  nature: { icon: PawPrintIcon },
  foods: { icon: HamburgerIcon },
  activity: { icon: SoccerBallIcon },
  places: { icon: AirplaneIcon },
  objects: { icon: LightbulbIcon },
  symbols: { icon: HashIcon },
  flags: { icon: FlagIcon },
};

export type EmojiCategoryId = keyof typeof CATEGORY_META;

export const EMOJI_CATEGORIES: EmojiCategory[] = data.categories
  .filter((category) => category.id in CATEGORY_META)
  .map((category) => {
    const id = category.id as EmojiCategoryId;
    return {
      id,
      icon: CATEGORY_META[id].icon,
      items: category.emojis
        .map((emojiId) => data.emojis[emojiId])
        .filter((emoji) => emoji !== undefined)
        .map((emoji) => ({
          id: emoji.id,
          native: emoji.skins[0]!.native,
          name: emoji.name,
          keywords: `${emoji.name} ${emoji.keywords.join(' ')}`.toLowerCase(),
        })),
    };
  });

export const EMOJI_BY_ID = new Map<string, EmojiItem>(
  EMOJI_CATEGORIES.flatMap((category) => category.items).map((item) => [item.id, item]),
);

export function searchEmojis(query: string): EmojiItem[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const matches: EmojiItem[] = [];
  for (const item of EMOJI_BY_ID.values()) {
    if (item.keywords.includes(needle)) matches.push(item);
  }
  return matches;
}

const FREQUENT_STORAGE_KEY = 'ap-chats:frequent-emojis';
const MAX_FREQUENT = 24;

export function readFrequentEmojis(): EmojiItem[] {
  try {
    const stored = JSON.parse(localStorage.getItem(FREQUENT_STORAGE_KEY) ?? '[]') as unknown;
    if (!Array.isArray(stored)) return [];
    return stored
      .filter((id): id is string => typeof id === 'string')
      .map((id) => EMOJI_BY_ID.get(id))
      .filter((item): item is EmojiItem => item !== undefined);
  } catch {
    return [];
  }
}

export function recordFrequentEmoji(id: string): void {
  const current = readFrequentEmojis()
    .map((item) => item.id)
    .filter((existing) => existing !== id);
  current.unshift(id);
  localStorage.setItem(FREQUENT_STORAGE_KEY, JSON.stringify(current.slice(0, MAX_FREQUENT)));
}
