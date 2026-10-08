import { theme } from 'antd';

import { luminance } from '../canvas/color';
import type { WallpaperAppearance } from '../types';

export interface WallpaperBase {
  appearance: WallpaperAppearance;
  color: string;
}

// The wallpaper starts from the app's own page background, so it follows the theme
// instead of bringing its own; a dark theme would get the dark rendering for free.
export function useWallpaperBase(): WallpaperBase {
  const { token } = theme.useToken();
  const appearance = luminance(token.colorBgContainer) < 0.4 ? 'dark' : 'light';
  return { appearance, color: token.colorBgLayout };
}
