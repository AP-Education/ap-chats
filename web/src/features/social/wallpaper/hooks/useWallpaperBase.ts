import { theme } from 'antd';

import { surfaceAppearance } from '@/shared/theme/color';

import type { WallpaperAppearance } from '../types';

export interface WallpaperBase {
  appearance: WallpaperAppearance;
  color: string;
}

// The wallpaper starts from the app's own page background, so it follows the theme
// instead of bringing its own; a dark theme would get the dark rendering for free.
export function useWallpaperBase(): WallpaperBase {
  const { token } = theme.useToken();
  return { appearance: surfaceAppearance(token.colorBgContainer), color: token.colorBgLayout };
}
