import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { Appearance } from 'react-native';

import { useShellPalette } from '../store/appearance-store';

/**
 * Paints the app window itself in the theme: whatever no view covers for a moment shows it,
 * such as the keyboard's rounded corners while it slides or the strip it uncovers before the
 * page catches up. Left alone, that ground is white. Native controls take the page's theme
 * too, rather than the phone's: the tab bar's glass, the keyboard and system dialogs.
 */
export function WindowBackground() {
  const { surface, appearance } = useShellPalette();

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(surface).catch(() => undefined);
  }, [surface]);

  useEffect(() => {
    Appearance.setColorScheme(appearance);
  }, [appearance]);

  return null;
}
