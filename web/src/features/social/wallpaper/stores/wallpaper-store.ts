import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { defaultWallpaper, findWallpaper } from '../presets';
import type { WallpaperPreset } from '../types';

interface WallpaperState {
  presetId: string;
  choose: (presetId: string) => void;
}

const useWallpaperStore = create<WallpaperState>()(
  persist(
    (set) => ({
      presetId: defaultWallpaper.id,
      choose: (presetId) => set({ presetId }),
    }),
    {
      name: 'ap-chats:chat-wallpaper',
      version: 1,
      partialize: ({ presetId }) => ({ presetId }),
    },
  ),
);

export function useChatWallpaper(): WallpaperPreset {
  return findWallpaper(useWallpaperStore((state) => state.presetId));
}

export function useChooseWallpaper() {
  return useWallpaperStore((state) => state.choose);
}
