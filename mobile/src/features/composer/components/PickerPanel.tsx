import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../../../shell/theme';
import type { GifResult, PickerTab } from '../types';
import { EmojiTab } from './EmojiTab';
import { GifTab } from './GifTab';
import { StickerTab } from './StickerTab';

const TAB_OPTIONS: { label: string; value: PickerTab }[] = [
  { label: 'GIF', value: 'gif' },
  { label: 'Стікери', value: 'sticker' },
  { label: 'Емодзі', value: 'emoji' },
];

interface PickerPanelProps {
  activeTab: PickerTab;
  onTabChange: (tab: PickerTab) => void;
  onPickEmoji: (emoji: string) => void;
  onPickGif: (gif: GifResult) => void;
  onSearchFocus: () => void;
}

export function PickerPanel({
  activeTab,
  onTabChange,
  onPickEmoji,
  onPickGif,
  onSearchFocus,
}: PickerPanelProps) {
  return (
    <View style={styles.root}>
      <View style={styles.tabs}>
        {TAB_OPTIONS.map((option) => (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === option.value }}
            style={[styles.tab, activeTab === option.value && styles.tabActive]}
            onPress={() => onTabChange(option.value)}
          >
            <Text style={[styles.tabText, activeTab === option.value && styles.tabTextActive]}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.body}>
        {activeTab === 'gif' && <GifTab onPick={onPickGif} onSearchFocus={onSearchFocus} />}
        {activeTab === 'sticker' && <StickerTab />}
        {activeTab === 'emoji' && <EmojiTab onPick={onPickEmoji} onSearchFocus={onSearchFocus} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: spacing.sm, paddingTop: spacing.xs, gap: spacing.xs },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.primaryBg,
    borderRadius: radius.sm,
    padding: 2,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: radius.sm - 2,
  },
  tabActive: { backgroundColor: colors.surface },
  tabText: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
  tabTextActive: { color: colors.primary },
  body: { flex: 1 },
});
