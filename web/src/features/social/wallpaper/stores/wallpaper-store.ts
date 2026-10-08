import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { defaultWallpaper, findWallpaper } from '../presets';
import type { WallpaperAppearance, WallpaperPreset } from '../types';

interface WallpaperState {
  presetId: string;
  /** Each theme keeps its own choice: grain helps pale gradients and is opt-in on dark. */
  grain: Record<WallpaperAppearance, boolean>;
  choose: (presetId: string) => void;
  setGrain: (appearance: WallpaperAppearance, visible: boolean) => void;
}

const useWallpaperStore = create<WallpaperState>()(
  persist(
    (set) => ({
      presetId: defaultWallpaper.id,
      grain: { light: true, dark: false },
      choose: (presetId) => set({ presetId }),
      setGrain: (appearance, visible) =>
        set((state) => ({ grain: { ...state.grain, [appearance]: visible } })),
    }),
    {
      name: 'ap-chats:chat-wallpaper',
      version: 1,
      partialize: ({ presetId, grain }) => ({ presetId, grain }),
    },
  ),
);

export function useChatWallpaper(): WallpaperPreset {
  return findWallpaper(useWallpaperStore((state) => state.presetId));
}

export function useChooseWallpaper() {
  return useWallpaperStore((state) => state.choose);
}

export function useWallpaperGrain(appearance: WallpaperAppearance): boolean {
  return useWallpaperStore((state) => state.grain[appearance]);
}

export function useSetWallpaperGrain() {
  return useWallpaperStore((state) => state.setGrain);
}
