import { FlashList } from '@shopify/flash-list';
import { MagnifyingGlass } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
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
import { isGifSearchConfigured, searchGifs } from '../api/gif-provider';
import type { GifResult } from '../types';

const SEARCH_DEBOUNCE_MS = 350;
const COLUMNS = 2;

interface GifTabProps {
  onPick: (gif: GifResult) => void;
  onSearchFocus: () => void;
}

export function GifTab({ onPick, onSearchFocus }: GifTabProps) {
  const palette = useShellPalette();
  const styles = useThemedStyles(themedStyles);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GifResult[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const configured = isGifSearchConfigured();

  useEffect(() => {
    if (!configured) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      setStatus('loading');
      searchGifs(query, controller.signal)
        .then((found) => {
          setResults(found);
          setStatus('idle');
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          console.error('GIF search failed', error);
          setStatus('error');
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query, configured]);

  if (!configured) {
    return (
      <View style={styles.state}>
        <Text style={styles.stateText}>Пошук GIF зараз недоступний.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.searchRow}>
        <MagnifyingGlass size={16} color={palette.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Пошук GIF"
          placeholderTextColor={palette.textSecondary}
          value={query}
          onChangeText={setQuery}
          onFocus={onSearchFocus}
          accessibilityLabel="Пошук GIF"
        />
      </View>
      {status === 'loading' && results.length === 0 ? (
        <View style={styles.state}>
          <ActivityIndicator color={palette.primary} />
        </View>
      ) : status === 'error' ? (
        <View style={styles.state}>
          <Text style={styles.stateText}>Не вдалося завантажити GIF. Спробуйте ще раз.</Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.state}>
          <Text style={styles.stateText}>Нічого не знайдено.</Text>
        </View>
      ) : (
        <FlashList
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          data={results}
          numColumns={COLUMNS}
          keyExtractor={(gif) => gif.id}
          renderItem={({ item: gif }) => (
            <Pressable
              style={styles.tile}
              accessibilityRole="button"
              accessibilityLabel={gif.title || 'GIF'}
              onPress={() => onPick(gif)}
            >
              <Image source={{ uri: gif.previewUrl }} style={styles.tileImage} resizeMode="cover" />
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
      aspectRatio: 1,
      margin: 3,
      borderRadius: radius.sm,
      overflow: 'hidden',
      backgroundColor: palette.primaryBg,
    },
    tileImage: { width: '100%', height: '100%' },
    state: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.md },
    stateText: { color: palette.textSecondary, fontSize: 13, textAlign: 'center' },
  });
