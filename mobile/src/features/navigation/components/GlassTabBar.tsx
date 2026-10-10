import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useShellPalette } from '../../appearance';
import type { TabBarProps } from '../types';
import { TabIcon } from './TabIcon';

const SYSTEM_RED = '#ff3b30';

/** iOS: a floating Liquid Glass capsule over the page, as the iOS 26 tab bar. */
export function GlassTabBar({ items, activeId, onSelect }: TabBarProps) {
  const palette = useShellPalette();
  const insets = useSafeAreaInsets();
  // Before iOS 26 GlassView is a plain view, so it needs a surface of its own.
  const fallback = isLiquidGlassAvailable() ? undefined : { backgroundColor: palette.surface };

  return (
    <View style={[styles.frame, { paddingBottom: Math.max(insets.bottom - 8, 8) }]}>
      <GlassView
        glassEffectStyle="regular"
        isInteractive
        colorScheme={palette.appearance}
        style={[styles.capsule, fallback]}
      >
        {items.map((tab) => {
          const active = tab.id === activeId;
          const color = active ? palette.primary : palette.text;

          return (
            <Pressable
              key={tab.id}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: active }}
              onPress={() => onSelect(tab.id)}
              style={[styles.tab, active && { backgroundColor: palette.primaryBg }]}
            >
              <TabIcon tab={tab} active={active} color={color} badgeColor={SYSTEM_RED} />
              <Text style={[styles.label, { color }]} numberOfLines={1}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </GlassView>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { paddingHorizontal: 16 },
  capsule: {
    flexDirection: 'row',
    height: 62,
    padding: 4,
    borderRadius: 31,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: 27,
  },
  label: { fontSize: 10, fontWeight: '600' },
});
