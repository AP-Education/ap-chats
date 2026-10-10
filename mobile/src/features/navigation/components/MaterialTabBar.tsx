import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useShellPalette } from '../../appearance';
import type { TabBarProps } from '../types';
import { TabIcon } from './TabIcon';

const ERROR_RED = '#b3261e';

/** Android: a Material 3 navigation bar with the selected tab's indicator pill. */
export function MaterialTabBar({ items, activeId, onSelect }: TabBarProps) {
  const palette = useShellPalette();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { backgroundColor: palette.surface, paddingBottom: insets.bottom }]}>
      {items.map((tab) => {
        const active = tab.id === activeId;

        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: active }}
            android_ripple={{ color: palette.primaryBg, borderless: true, radius: 32 }}
            onPress={() => onSelect(tab.id)}
            style={styles.tab}
          >
            <View style={[styles.indicator, active && { backgroundColor: palette.primaryBg }]}>
              <TabIcon
                tab={tab}
                active={active}
                color={active ? palette.primary : palette.textSecondary}
                badgeColor={ERROR_RED}
              />
            </View>
            <Text
              style={[
                styles.label,
                active
                  ? { color: palette.text, fontWeight: '700' }
                  : { color: palette.textSecondary },
              ]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', paddingTop: 12, elevation: 3 },
  tab: { flex: 1, alignItems: 'center', gap: 4, paddingBottom: 16 },
  indicator: {
    width: 64,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  label: { fontSize: 12, fontWeight: '500' },
});
