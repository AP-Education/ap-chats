import type { EmojiMartData } from '@emoji-mart/data';
import rawData from '@emoji-mart/data';
import type { Icon } from 'phosphor-react-native';
import {
  Airplane,
  Flag,
  Hamburger,
  Hash,
  Lightbulb,
  PawPrint,
  Smiley,
  SoccerBall,
} from 'phosphor-react-native';

import type { EmojiCategory, EmojiCategoryId, EmojiItem } from '../types';

const data = rawData as EmojiMartData;

export const FREQUENT_CATEGORY_ID = 'frequent';

const CATEGORY_ICONS: Record<EmojiCategoryId, Icon> = {
  people: Smiley,
  nature: PawPrint,
  foods: Hamburger,
  activity: SoccerBall,
  places: Airplane,
  objects: Lightbulb,
  symbols: Hash,
  flags: Flag,
};

export const EMOJI_CATEGORIES: EmojiCategory[] = data.categories
  .filter(
    (category): category is typeof category & { id: EmojiCategoryId } =>
      category.id in CATEGORY_ICONS,
  )
  .map((category) => {
    return {
      id: category.id,
      icon: CATEGORY_ICONS[category.id],
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
