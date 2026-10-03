import type { Icon } from 'phosphor-react-native';

export type PickerTab = 'gif' | 'sticker' | 'emoji';

export interface EmojiItem {
  id: string;
  native: string;
  name: string;
  keywords: string;
}

export interface EmojiCategory {
  id: string;
  label: string;
  icon: Icon;
  items: EmojiItem[];
}

export interface GifResult {
  id: string;
  title: string;
  previewUrl: string;
  url: string;
}
