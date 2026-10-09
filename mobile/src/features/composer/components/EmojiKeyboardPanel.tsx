import { StyleSheet } from 'react-native';
import Reanimated, { type SharedValue, useAnimatedStyle } from 'react-native-reanimated';

import { type ShellPalette, useThemedStyles } from '../../appearance';
import type { GifResult, PickerTab } from '../types';
import { inputAreaHeight, type InputMode } from '../utils/input-state';
import { PickerPanel } from './PickerPanel';

interface EmojiKeyboardPanelProps {
  mode: SharedValue<InputMode>;
  keyboardHeight: SharedValue<number>;
  panelHeight: SharedValue<number>;
  heldHeight: SharedValue<number>;
  bottomInset: number;
  /** Kept below the page even while nothing is open, where the page can't pad itself. */
  reservedInset: number;
  containerHeight: number;
  visible: boolean;
  activeTab: PickerTab;
  onTabChange: (tab: PickerTab) => void;
  onPickEmoji: (emoji: string) => void;
  onPickGif: (gif: GifResult) => void;
  onSearchFocus: () => void;
}

export function EmojiKeyboardPanel({
  mode,
  keyboardHeight,
  panelHeight,
  heldHeight,
  bottomInset,
  reservedInset,
  containerHeight,
  visible,
  activeTab,
  onTabChange,
  onPickEmoji,
  onPickGif,
  onSearchFocus,
}: EmojiKeyboardPanelProps) {
  const styles = useThemedStyles(themedStyles);
  const animatedStyle = useAnimatedStyle(() => ({
    height: inputAreaHeight(
      mode.value,
      keyboardHeight.value,
      panelHeight.value,
      heldHeight.value,
      reservedInset,
      containerHeight,
    ),
  }));
  const contentStyle = useAnimatedStyle(() => ({
    height:
      mode.value === 'search'
        ? inputAreaHeight(
            'search',
            keyboardHeight.value,
            panelHeight.value,
            0,
            bottomInset,
            containerHeight,
          ) - keyboardHeight.value
        : panelHeight.value,
    paddingBottom: mode.value === 'search' ? 0 : bottomInset,
  }));

  return (
    <Reanimated.View style={[styles.root, animatedStyle]}>
      {visible && (
        <Reanimated.View style={contentStyle}>
          <PickerPanel
            activeTab={activeTab}
            onTabChange={onTabChange}
            onPickEmoji={onPickEmoji}
            onPickGif={onPickGif}
            onSearchFocus={onSearchFocus}
          />
        </Reanimated.View>
      )}
    </Reanimated.View>
  );
}

const themedStyles = (palette: ShellPalette) =>
  StyleSheet.create({
    root: {
      overflow: 'hidden',
      backgroundColor: palette.surface,
    },
  });
