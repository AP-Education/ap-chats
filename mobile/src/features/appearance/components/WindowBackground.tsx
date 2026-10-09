import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';

import { useShellPalette } from '../store/appearance-store';

/**
 * Paints the app window itself in the theme: whatever no view covers for a moment shows it,
 * such as the keyboard's rounded corners while it slides or the strip it uncovers before the
 * page catches up. Left alone, that ground is white.
 */
export function WindowBackground() {
  const { surface } = useShellPalette();

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(surface).catch(() => undefined);
  }, [surface]);

  return null;
}
