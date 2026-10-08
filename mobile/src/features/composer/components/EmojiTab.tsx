import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { ClockCounterClockwise, MagnifyingGlass } from 'phosphor-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { radius, spacing } from '../../../shell/theme';
import { type ShellPalette, useShellPalette, useThemedStyles } from '../../appearance';
import { readFrequentEmojis, recordFrequentEmoji } from '../store/frequent-emojis';
import type { EmojiCategory, EmojiItem } from '../types';
import { EMOJI_CATEGORIES, FREQUENT_CATEGORY_ID, searchEmojis } from '../utils/emoji-data';

const COLUMNS = 8;
const EMOJI_FONT_SIZE = 26;

type Row =
  | { key: string; type: 'header'; categoryId: string; label: string }
  | { key: string; type: 'grid'; categoryId: string; items: EmojiItem[] };

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function buildRows(frequent: EmojiItem[]): Row[] {
  const rows: Row[] = [];
  if (frequent.length > 0) {
    rows.push({
      key: `header-${FREQUENT_CATEGORY_ID}`,
      type: 'header',
      categoryId: FREQUENT_CATEGORY_ID,
      label: 'Часто використовувані',
    });
    chunk(frequent, COLUMNS).forEach((items, index) =>
      rows.push({
        key: `${FREQUENT_CATEGORY_ID}-${index}`,
        type: 'grid',
        categoryId: FREQUENT_CATEGORY_ID,
        items,
      }),
    );
  }
  EMOJI_CATEGORIES.forEach((category) => {
    rows.push({
      key: `header-${category.id}`,
      type: 'header',
      categoryId: category.id,
      label: category.label,
    });
    chunk(category.items, COLUMNS).forEach((items, index) =>
      rows.push({ key: `${category.id}-${index}`, type: 'grid', categoryId: category.id, items }),
    );
  });
  return rows;
}

interface EmojiTabProps {
  onPick: (emoji: string) => void;
  onSearchFocus: () => void;
}

export function EmojiTab({ onPick, onSearchFocus }: EmojiTabProps) {
  const palette = useShellPalette();
  const styles = useThemedStyles(themedStyles);
  const [query, setQuery] = useState('');
  const [frequent, setFrequent] = useState<EmojiItem[]>([]);
  const listRef = useRef<FlashListRef<Row>>(null);

  useEffect(() => {
    void readFrequentEmojis().then(setFrequent);
  }, []);

  const rows = useMemo<Row[]>(() => {
    const trimmed = query.trim();
    if (trimmed) {
      const matches = searchEmojis(trimmed);
      if (matches.length === 0) return [];
      return chunk(matches, COLUMNS).map((items, index) => ({
        key: `search-${index}`,
        type: 'grid' as const,
        categoryId: 'search',
        items,
      }));
    }
    return buildRows(frequent);
  }, [query, frequent]);

  const categoryStartIndex = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((row, index) => {
      if (row.type === 'header' && !map.has(row.categoryId)) map.set(row.categoryId, index);
    });
    return map;
  }, [rows]);

  function pick(item: EmojiItem) {
    void recordFrequentEmoji(item.id).then(() => readFrequentEmojis().then(setFrequent));
    onPick(item.native);
  }

  function jumpToCategory(categoryId: string) {
    const index = categoryStartIndex.get(categoryId);
    if (index !== undefined) listRef.current?.scrollToIndex({ index, animated: false });
  }

  const navCategories: { id: string; icon: EmojiCategory['icon'] }[] = [
    ...(frequent.length > 0 ? [{ id: FREQUENT_CATEGORY_ID, icon: ClockCounterClockwise }] : []),
    ...EMOJI_CATEGORIES,
  ];

  return (
    <View style={styles.root}>
      <View style={styles.searchRow}>
        <MagnifyingGlass size={16} color={palette.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Пошук емодзі"
          placeholderTextColor={palette.textSecondary}
          value={query}
          onChangeText={setQuery}
          onFocus={onSearchFocus}
          accessibilityLabel="Пошук емодзі"
        />
      </View>
      {!query.trim() && (
        <View style={styles.nav}>
          {navCategories.map((category) => (
            <Pressable
              key={category.id}
              style={styles.navButton}
              onPress={() => jumpToCategory(category.id)}
            >
              <category.icon size={18} color={palette.textSecondary} />
            </Pressable>
          ))}
        </View>
      )}
      {rows.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Нічого не знайдено.</Text>
        </View>
      ) : (
        <FlashList
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          ref={listRef}
          data={rows}
          keyExtractor={(row) => row.key}
          renderItem={({ item: row }) =>
            row.type === 'header' ? (
              <Text style={styles.sectionHeader}>{row.label}</Text>
            ) : (
              <View style={styles.row}>
                {row.items.map((item) => (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    accessibilityLabel={item.name}
                    style={styles.emojiButton}
                    onPress={() => pick(item)}
                  >
                    <Text style={styles.emojiText}>{item.native}</Text>
                  </Pressable>
                ))}
              </View>
            )
          }
        />
      )}
    </View>
  );
}

const themedStyles = (palette: ShellPalette) =>
  StyleSheet.create({
    root: { flex: 1, gap: spacing.xs },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.sm,
      height: 36,
      borderRadius: radius.sm,
      backgroundColor: palette.primaryBg,
    },
    searchInput: { flex: 1, fontSize: 15, color: palette.text, padding: 0 },
    nav: { flexDirection: 'row', gap: 2 },
    navButton: {
      width: 30,
      height: 30,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.sm,
    },
    sectionHeader: {
      paddingVertical: 4,
      fontSize: 12,
      fontWeight: '600',
      color: palette.textSecondary,
      textTransform: 'uppercase',
    },
    row: { flexDirection: 'row' },
    emojiButton: {
      flex: 1,
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emojiText: { fontSize: EMOJI_FONT_SIZE },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyText: { color: palette.textSecondary, fontSize: 13 },
  });
