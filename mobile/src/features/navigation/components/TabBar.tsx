import { selectionAsync } from 'expo-haptics';
import { Platform, StyleSheet } from 'react-native';
import { useKeyboardState } from 'react-native-keyboard-controller';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';

import type { TabBarModel } from '../types';
import { GlassTabBar } from './GlassTabBar';
import { MaterialTabBar } from './MaterialTabBar';

interface TabBarDockProps {
  model: TabBarModel;
  onSelect: (id: string) => void;
  /** How much of the page's bottom the bar covers, so its lists keep clear of it. */
  onInset: (bottom: number) => void;
}

const PlatformTabBar = Platform.OS === 'ios' ? GlassTabBar : MaterialTabBar;

/** The page's tab bar, drawn natively over the WebView while the page shows its lists. */
export function TabBar({ model, onSelect, onInset }: TabBarDockProps) {
  const keyboardShown = useKeyboardState((state) => state.isVisible);
  if (!model.visible || keyboardShown) return null;

  function select(id: string) {
    void selectionAsync().catch(() => undefined);
    onSelect(id);
  }

  return (
    <Animated.View
      entering={SlideInDown.duration(200)}
      exiting={SlideOutDown.duration(160)}
      style={styles.dock}
      onLayout={(event) => onInset(event.nativeEvent.layout.height)}
    >
      <PlatformTabBar items={model.items} activeId={model.activeId} onSelect={select} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  dock: { position: 'absolute', right: 0, bottom: 0, left: 0 },
});
