import { useMediaQuery } from '@/shared/hooks/useMediaQuery';

import { useThemeMode } from '../stores/appearance-store';
import type { Appearance } from '../types';

export function useAppearance(): Appearance {
  const mode = useThemeMode();
  const systemPrefersDark = useMediaQuery('(prefers-color-scheme: dark)');

  if (mode === 'system') return systemPrefersDark ? 'dark' : 'light';
  return mode;
}
