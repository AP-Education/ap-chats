import type { AppleIcon } from 'react-native-bottom-tabs';

// Bridge protocol: mirrors the tab bar messages in ap-app's host (features/layout/types.ts).
export interface NativeTab {
  id: string;
  label: string;
  symbol: { ios: AppleIcon['sfSymbol']; android: string };
  /** A PNG data URL drawn in its own colours in place of the symbol, e.g. the person's avatar. */
  picture?: string;
  badge: number;
}

export interface TabBarModel {
  items: NativeTab[];
  activeId: string;
  /** Over the lists only; a conversation takes the whole screen. */
  visible: boolean;
  /** How long the drawer takes to reach `visible`, so the bar moves with it. */
  duration?: number;
  /** A page dialog covers the screen; the bar steps out of its way until it closes. */
  covered?: boolean;
}
