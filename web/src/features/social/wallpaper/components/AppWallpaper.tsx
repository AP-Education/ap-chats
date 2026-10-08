import type { CSSProperties } from 'react';

import { useWallpaperBase } from '../hooks/useWallpaperBase';
import { useChatWallpaper } from '../stores/wallpaper-store';
import { ViewportFrame } from './ViewportFrame';
import { GrainLayer, LightLayer } from './WallpaperLayers';

// Two materials over the wallpaper. Surface: large panels take a translucent tint of the
// light behind them, like Mica, with no live blur to compute. Glass: small floating controls
// over moving content, paired with a backdrop blur where they are used.
const MATERIALS = {
  light: { surface: 'rgba(255, 255, 255, 0.62)', glass: 'rgba(255, 255, 255, 0.86)' },
  dark: { surface: 'rgba(19, 26, 28, 0.72)', glass: 'rgba(32, 40, 43, 0.8)' },
};

/**
 * The wallpaper's light across the whole app, behind every panel. The line art stays in
 * the chat, so panels over this layer only ever cover smooth colour.
 */
export function AppWallpaper() {
  const preset = useChatWallpaper();
  const base = useWallpaperBase();

  return (
    <ViewportFrame>
      <LightLayer preset={preset} base={base} />
      <GrainLayer appearance={base.appearance} />
    </ViewportFrame>
  );
}

export function useSurfaceMaterials(): CSSProperties {
  const { appearance } = useWallpaperBase();
  const { surface, glass } = MATERIALS[appearance];
  return { '--app-surface': surface, '--glass': glass } as CSSProperties;
}
