import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { defaultAccent, findAccent } from '../accents';
import type { AccentPreset, ThemeMode } from '../types';

interface AppearanceState {
  mode: ThemeMode;
  accentId: string;
  chooseMode: (mode: ThemeMode) => void;
  chooseAccent: (accentId: string) => void;
}

const useAppearanceStore = create<AppearanceState>()(
  persist(
    (set) => ({
      mode: 'light',
      accentId: defaultAccent.id,
      chooseMode: (mode) => set({ mode }),
      chooseAccent: (accentId) => set({ accentId }),
    }),
    {
      name: 'ap-chats:appearance',
      version: 1,
      partialize: ({ mode, accentId }) => ({ mode, accentId }),
    },
  ),
);

export function useThemeMode(): ThemeMode {
  return useAppearanceStore((state) => state.mode);
}

export function useAccent(): AccentPreset {
  return findAccent(useAppearanceStore((state) => state.accentId));
}

export function useAppearanceActions() {
  const chooseMode = useAppearanceStore((state) => state.chooseMode);
  const chooseAccent = useAppearanceStore((state) => state.chooseAccent);
  return { chooseMode, chooseAccent };
}
