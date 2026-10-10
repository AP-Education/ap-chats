import type { AndroidSymbol, SFSymbol } from 'expo-symbols';

// Bridge protocol: mirrors the tab bar messages in ap-app's host (features/layout/types.ts).
export interface NativeTab {
  id: string;
  label: string;
  symbol: { ios: SFSymbol; android: AndroidSymbol };
  badge: number;
}

export interface TabBarModel {
  items: NativeTab[];
  activeId: string;
  /** Over the lists only; a conversation takes the whole screen. */
  visible: boolean;
}

export interface TabBarProps {
  items: NativeTab[];
  activeId: string;
  onSelect: (id: string) => void;
}
