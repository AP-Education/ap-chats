import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { colors } from '../../../shell/theme';
import type { ShellPalette } from '../types';

const LIGHT: ShellPalette = {
  appearance: 'light',
  surface: colors.surface,
  primary: colors.primary,
  primaryBg: colors.primaryBg,
  text: colors.text,
  textSecondary: colors.textSecondary,
};

interface AppearanceState {
  palette: ShellPalette;
  setPalette: (palette: ShellPalette) => void;
}

// Persisted, so a cold start paints the last theme before the page has loaded to say so.
export const useAppearanceStore = create<AppearanceState>()(
  persist(
    (set) => ({
      palette: LIGHT,
      setPalette: (palette) => set({ palette }),
    }),
    {
      name: 'ap-chats:shell-palette',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ palette }) => ({ palette }),
    },
  ),
);

export function useShellPalette(): ShellPalette {
  return useAppearanceStore((state) => state.palette);
}
