import AsyncStorage from '@react-native-async-storage/async-storage';

import type { EmojiItem } from '../types';
import { EMOJI_BY_ID } from '../utils/emoji-data';

const STORAGE_KEY = 'ap-chats:frequent-emojis';
const MAX_FREQUENT = 24;

export async function readFrequentEmojis(): Promise<EmojiItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const stored = JSON.parse(raw ?? '[]') as unknown;
    if (!Array.isArray(stored)) return [];
    return stored
      .filter((id): id is string => typeof id === 'string')
      .map((id) => EMOJI_BY_ID.get(id))
      .filter((item): item is EmojiItem => item !== undefined);
  } catch {
    return [];
  }
}

export async function recordFrequentEmoji(id: string): Promise<void> {
  const current = (await readFrequentEmojis())
    .map((item) => item.id)
    .filter((existing) => existing !== id);
  current.unshift(id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current.slice(0, MAX_FREQUENT)));
}
