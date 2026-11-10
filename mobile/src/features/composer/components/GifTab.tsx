import { FlashList } from '@shopify/flash-list';
import { MagnifyingGlass } from 'phosphor-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { radius, spacing } from '../../../shell/theme';
import { type ShellPalette, useShellPalette, useThemedStyles } from '../../appearance';
import { isGifSearchConfigured } from '../api/gif-provider';
import { useGifSearch } from '../hooks/useGifSearch';
import type { GifResult } from '../types';

const COLUMNS = 2;

interface GifTabProps {
  onPick: (gif: GifResult) => void;
  onSearchFocus: () => void;
}

export function GifTab({ onPick, onSearchFocus }: GifTabProps) {
  const { t } = useTranslation('composer');
  const palette = useShellPalette();
  const styles = useThemedStyles(themedStyles);
  const [query, setQuery] = useState('');
  const configured = isGifSearchConfigured();
  const { status, gifs, loadMore } = useGifSearch(query, configured);

  if (!configured) {
    return (
      <View style={styles.state}>
        <Text style={styles.stateText}>{t(($) => $.gif.unavailable)}</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.searchRow}>
        <MagnifyingGlass size={16} color={palette.textSecondary} />
        <TextInput
          style={styles.searchInput}
          // KLIPY's terms require its name as the search placeholder.
          placeholder={t(($) => $.gif.searchPlaceholder)}
          placeholderTextColor={palette.textSecondary}
          value={query}
          onChangeText={setQuery}
          onFocus={onSearchFocus}
          accessibilityLabel={t(($) => $.gif.search)}
        />
      </View>
      {status === 'loading' && gifs.length === 0 ? (
        <View style={styles.state}>
          <ActivityIndicator color={palette.primary} />
        </View>
      ) : status === 'error' ? (
        <View style={styles.state}>
          <Text style={styles.stateText}>{t(($) => $.gif.error)}</Text>
        </View>
      ) : gifs.length === 0 ? (
        <View style={styles.state}>
          <Text style={styles.stateText}>{t(($) => $.gif.empty)}</Text>
        </View>
      ) : (
        <FlashList
          masonry
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          data={gifs}
          numColumns={COLUMNS}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          keyExtractor={(gif, index) => `${index}:${gif.slug}`}
          renderItem={({ item: gif }) => (
            <Pressable
              style={[styles.tile, { aspectRatio: gif.preview.width / gif.preview.height }]}
              accessibilityRole="button"
              accessibilityLabel={gif.title || 'GIF'}
              onPress={() => onPick(gif)}
            >
              <Image
                source={{ uri: gif.preview.url }}
                style={styles.tileImage}
                resizeMode="cover"
              />
            </Pressable>
          )}
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
    tile: {
      flex: 1,
      margin: 3,
      borderRadius: radius.sm,
      overflow: 'hidden',
      backgroundColor: palette.primaryBg,
    },
    tileImage: { width: '100%', height: '100%' },
    state: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.md },
    stateText: { color: palette.textSecondary, fontSize: 13, textAlign: 'center' },
  });
