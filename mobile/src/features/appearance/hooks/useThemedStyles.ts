import { useMemo } from 'react';

import { useShellPalette } from '../store/appearance-store';
import type { ShellPalette } from '../types';

/** Styles rebuilt from the current palette, for native panels that sit beside the page. */
export function useThemedStyles<T>(create: (palette: ShellPalette) => T): T {
  const palette = useShellPalette();
  return useMemo(() => create(palette), [create, palette]);
}
