import { useEffect } from 'react';
import { useKeyboardState } from 'react-native-keyboard-controller';

import type { TabBarModel } from '../types';
import { FloatingTabBar, useFloatingTabBarSpace } from './FloatingTabBar';

interface OverlayTabsProps {
  model: TabBarModel;
  onSelect: (id: string) => void;
  onInset: (bottom: number) => void;
}

/**
 * Android's tabs: the page never moves and a tab is a route inside it, so switching is the page's
 * own navigation. The bar floats over it and stays mounted, hidden rather than removed.
 */
export function OverlayTabs({ model, onSelect, onInset }: OverlayTabsProps) {
  const underKeyboard = useKeyboardState((state) => state.isVisible);
  const barSpace = useFloatingTabBarSpace();
  const coversPage = model.visible && !underKeyboard;

  useEffect(() => {
    onInset(coversPage ? barSpace : 0);
  }, [coversPage, barSpace, onInset]);

  return <FloatingTabBar model={model} onSelect={onSelect} underKeyboard={underKeyboard} />;
}
