import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { type CSSTransitionProperties, cubicBezier } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type ShellPalette, useThemedStyles } from '../../appearance';
import type { TabBarModel } from '../types';
import { FloatingTab } from './FloatingTab';

const BAR_HEIGHT = 64;
const BAR_MARGIN = 12;
// Room around the bar for its shadow, which the drawer's edge would otherwise cut.
const SHADOW_ROOM = 16;

// ap-app's drawer (packages/ui, drawer-settle.ts): the bar leaves and returns with it.
const DRAWER_DURATION = 320;
const DRAWER_EASING = cubicBezier(0.32, 0.72, 0, 1);
const DRAWER_PARALLAX = 32;

/** How much of the screen's bottom the floating bar covers, measured up from the screen's edge. */
export function useFloatingTabBarSpace(): number {
  const insets = useSafeAreaInsets();
  return insets.bottom + BAR_MARGIN + BAR_HEIGHT;
}

interface FloatingTabBarProps {
  model: TabBarModel;
  onSelect: (id: string) => void;
  underKeyboard: boolean;
}

/**
 * Android's tab bar in the shape of iOS's Liquid Glass one, without its effects: a capsule floating
 * over the page, clear of the screen's edges, the active tab in a lens of its own.
 *
 * It belongs to the page's drawer: a conversation sliding over the drawer covers the bar from the
 * right as it goes, and the drawer brings it back.
 */
export const FloatingTabBar = ({ model, onSelect, underKeyboard }: FloatingTabBarProps) => {
  const styles = useThemedStyles(themedStyles);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const drawerMove = model.duration ?? DRAWER_DURATION;
  const transition: CSSTransitionProperties = {
    transitionProperty: 'transform',
    transitionDuration: drawerMove,
    transitionTimingFunction: DRAWER_EASING,
  };
  // The clip ends where the conversation's left edge is; the bar inside keeps its place but for the
  // drawer's parallax.
  const edgeShift = model.visible ? 0 : -width;
  const barShift = model.visible ? 0 : width - DRAWER_PARALLAX;
  const hidden = !model.visible || underKeyboard;

  return (
    <Animated.View
      style={[
        styles.drawerEdge,
        {
          bottom: insets.bottom + BAR_MARGIN - SHADOW_ROOM,
          transform: [{ translateX: edgeShift }],
        },
        transition,
      ]}
      pointerEvents={hidden ? 'none' : 'box-none'}
    >
      <Animated.View
        style={[
          styles.bar,
          { transform: [{ translateX: barShift }] },
          transition,
          underKeyboard && styles.underKeyboard,
        ]}
        accessibilityRole="tablist"
        accessibilityElementsHidden={hidden}
      >
        {model.items.map((tab) => (
          <FloatingTab
            key={tab.id}
            tab={tab}
            active={tab.id === model.activeId}
            onPress={() => onSelect(tab.id)}
          />
        ))}
      </Animated.View>
    </Animated.View>
  );
};

const themedStyles = (palette: ShellPalette) =>
  StyleSheet.create({
    drawerEdge: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: BAR_HEIGHT + SHADOW_ROOM * 2,
      overflow: 'hidden',
    },
    bar: {
      position: 'absolute',
      top: SHADOW_ROOM,
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
    underKeyboard: { opacity: 0, elevation: 0 },
  });
