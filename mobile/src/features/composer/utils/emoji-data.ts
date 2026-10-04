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

import type { EmojiCategory, EmojiItem } from '../types';

const data = rawData as EmojiMartData;

export const FREQUENT_CATEGORY_ID = 'frequent';

const CATEGORY_META: Record<string, { label: string; icon: Icon }> = {
  people: { label: 'Смайли і люди', icon: Smiley },
  nature: { label: 'Тварини і природа', icon: PawPrint },
  foods: { label: 'Їжа і напої', icon: Hamburger },
  activity: { label: 'Активності', icon: SoccerBall },
  places: { label: 'Подорожі та місця', icon: Airplane },
  objects: { label: 'Предмети', icon: Lightbulb },
  symbols: { label: 'Символи', icon: Hash },
  flags: { label: 'Прапори', icon: Flag },
};

export const EMOJI_CATEGORIES: EmojiCategory[] = data.categories
  .filter((category) => category.id in CATEGORY_META)
  .map((category) => {
    const meta = CATEGORY_META[category.id]!;
    return {
      id: category.id,
      label: meta.label,
      icon: meta.icon,
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
