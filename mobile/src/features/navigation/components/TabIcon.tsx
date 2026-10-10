import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import type { NativeTab } from '../types';

interface TabIconProps {
  tab: NativeTab;
  active: boolean;
  color: string;
  badgeColor: string;
}

export function TabIcon({ tab, active, color, badgeColor }: TabIconProps) {
  // SF Symbols draw a selected tab filled, as the system tab bar does.
  const ios = active ? (`${tab.symbol.ios}.fill` as NativeTab['symbol']['ios']) : tab.symbol.ios;

  return (
    <View>
      <SymbolView name={{ ios, android: tab.symbol.android }} size={24} tintColor={color} />
      {tab.badge > 0 && (
        <View style={[styles.badge, { backgroundColor: badgeColor }]}>
          <Text style={styles.badgeText}>{tab.badge > 99 ? '99+' : tab.badge}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    left: 16,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#ffffff', fontSize: 10, fontWeight: '700' },
});
