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

export interface GifImage {
  url: string;
  width: number;
  height: number;
}

export interface GifResult {
  slug: string;
  title: string;
  /** A small animated GIF for the picker tile, which React Native plays on both platforms. */
  preview: GifImage;
  /** What the message shows: the page renders it, in WebKit or Chromium, not React Native. */
  media: GifImage;
  /** KLIPY's blurred stand-in, a data URL the page reads the GIF's ThumbHash from. */
  placeholder: string | null;
}

export interface GifPage {
  gifs: GifResult[];
  nextPage: number | null;
}
