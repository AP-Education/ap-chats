import type { CSSProperties } from 'react';

import { useWallpaperBase } from '../hooks/useWallpaperBase';
import { useChatWallpaper } from '../stores/wallpaper-store';
import { ViewportFrame } from './ViewportFrame';
import { GrainLayer, LightLayer } from './WallpaperLayers';

const SURFACE = {
  light: 'rgba(255, 255, 255, 0.62)',
  dark: 'rgba(18, 20, 26, 0.72)',
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
      {(aspectRatio) => (
        <>
          <LightLayer preset={preset} base={base} aspectRatio={aspectRatio} />
          <GrainLayer appearance={base.appearance} />
        </>
      )}
    </ViewportFrame>
  );
}

// Panels take a translucent tint of the light behind them, like the Mica material: the
// colour of the wallpaper shows through as ambience, with no live blur to compute.
export function useAppSurfaceStyle(): CSSProperties {
  const { appearance } = useWallpaperBase();
  return { '--app-surface': SURFACE[appearance] } as CSSProperties;
}
