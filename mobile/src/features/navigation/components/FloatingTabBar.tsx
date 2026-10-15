import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type ShellPalette, useThemedStyles } from '../../appearance';
import type { TabBarModel } from '../types';
import { FloatingTab } from './FloatingTab';

const BAR_HEIGHT = 64;
const BAR_MARGIN = 12;

/** How much of the screen's bottom the floating bar covers, measured up from the screen's edge. */
export function useFloatingTabBarSpace(): number {
  const insets = useSafeAreaInsets();
  return insets.bottom + BAR_MARGIN + BAR_HEIGHT;
}

interface FloatingTabBarProps {
  model: TabBarModel;
  onSelect: (id: string) => void;
}

/**
 * Android's tab bar in the shape of iOS's Liquid Glass one, without its effects: a capsule floating
 * over the page, clear of the screen's edges, the active tab in a lens of its own.
 */
export const FloatingTabBar = ({ model, onSelect }: FloatingTabBarProps) => {
  const styles = useThemedStyles(themedStyles);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { bottom: insets.bottom + BAR_MARGIN }]} accessibilityRole="tablist">
      {model.items.map((tab) => (
        <FloatingTab
          key={tab.id}
          tab={tab}
          active={tab.id === model.activeId}
          onPress={() => onSelect(tab.id)}
        />
      ))}
    </View>
  );
};

const themedStyles = (palette: ShellPalette) =>
  StyleSheet.create({
    bar: {
      position: 'absolute',
      left: BAR_MARGIN + 4,
      right: BAR_MARGIN + 4,
      height: BAR_HEIGHT,
      flexDirection: 'row',
      padding: 4,
      borderRadius: BAR_HEIGHT / 2,
      backgroundColor: palette.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: palette.appearance === 'dark' ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)',
      elevation: 8,
      shadowColor: '#000000',
    },
  });
