import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { type ShellPalette, useShellPalette, useThemedStyles } from '../../appearance';
import type { NativeTab } from '../types';
import { renderTabIcon } from '../utils/tab-icons';

const ICON_SIZE = 24;
// The system's unread red, as iOS draws its tab badges.
const BADGE_COLOR = '#ff3b30';

interface FloatingTabProps {
  tab: NativeTab;
  active: boolean;
  onPress: () => void;
}

/** One tab of the floating bar: its icon or picture over its label, lifted by a soft lens when active. */
export const FloatingTab = ({ tab, active, onPress }: FloatingTabProps) => {
  const styles = useThemedStyles(themedStyles);
  const palette = useShellPalette();
  const tint = active ? palette.primary : palette.textSecondary;
  const badge = tab.badge > 99 ? '99+' : String(tab.badge);

  return (
    <Pressable
      style={styles.tab}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={tab.label}
    >
      {active && (
        <>
          <View style={[styles.lens, styles.lensFill]} />
          <View style={[styles.lens, styles.lensOutline]} />
        </>
      )}
      <View>
        {tab.picture ? (
          <Image
            source={{ uri: tab.picture }}
            style={[styles.picture, active && styles.pictureActive]}
          />
        ) : (
          renderTabIcon(tab.symbol.android, {
            size: ICON_SIZE,
            color: tint,
            weight: active ? 'fill' : 'regular',
          })
        )}
        {tab.badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.label, { color: tint }]} numberOfLines={1}>
        {tab.label}
      </Text>
    </Pressable>
  );
};

const themedStyles = (palette: ShellPalette) =>
  StyleSheet.create({
    tab: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
    },
    lens: {
      ...StyleSheet.absoluteFill,
      borderRadius: 999,
    },
    lensFill: {
      backgroundColor: palette.primaryBg,
    },
    // A thin primary outline over the soft tint, the way every active chip in the app reads.
    lensOutline: {
      borderWidth: 1,
      borderColor: palette.primary,
      opacity: 0.35,
    },
    picture: {
      width: ICON_SIZE,
      height: ICON_SIZE,
      borderRadius: ICON_SIZE / 2,
    },
    pictureActive: {
      borderWidth: 1.5,
      borderColor: palette.primary,
    },
    badge: {
      position: 'absolute',
      top: -4,
      left: ICON_SIZE - 8,
      minWidth: 18,
      height: 18,
      paddingHorizontal: 5,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: BADGE_COLOR,
      borderWidth: 2,
      borderColor: palette.surface,
    },
    badgeText: {
      color: '#ffffff',
      fontSize: 10,
      fontWeight: '700',
    },
    label: {
      fontSize: 11,
      fontWeight: '600',
    },
  });
