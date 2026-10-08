import { createStyles } from 'antd-style';
import { type CSSProperties, forwardRef, type HTMLAttributes } from 'react';

import { average, mix, withAlpha } from '../canvas/color';
import { useWallpaperBase, type WallpaperBase } from '../hooks/useWallpaperBase';
import { useChatWallpaper } from '../stores/wallpaper-store';
import type { WallpaperPreset } from '../types';
import { ViewportFrame } from './ViewportFrame';
import { PatternLayer } from './WallpaperLayers';

const useStyles = createStyles(({ css }) => ({
  surface: css`
    position: relative;
    isolation: isolate;
    overflow: hidden;
  `,
}));

// The chat surface publishes the wallpaper's colours as variables, so bubbles, pills and
// labels inside follow the chosen theme without knowing about wallpapers.
function surfaceColors(preset: WallpaperPreset, base: WallpaperBase): CSSProperties {
  const dark = base.appearance === 'dark';
  const deepTone = mix(average(preset.lights.map(({ color }) => color)), '#000000', 0.35);

  // Slightly see-through, so own bubbles pick up the light behind them through the blur
  // instead of sitting on the wallpaper as flat stripes.
  return {
    '--chat-own-from': withAlpha(preset.accent[0], 0.9),
    '--chat-own-to': withAlpha(preset.accent[1], 0.84),
    '--chat-incoming-bg': dark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.86)',
    '--chat-service-bg': dark ? 'rgba(255, 255, 255, 0.14)' : withAlpha(deepTone, 0.5),
    '--chat-service-strong': withAlpha(deepTone, 0.72),
  } as CSSProperties;
}

// The line art over the app wallpaper, aligned with it; the light itself comes from
// AppWallpaper behind the whole layout.
export const ChatWallpaperSurface = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function ChatWallpaperSurface({ className, style, children, ...rest }, ref) {
    const { styles, cx } = useStyles();
    const preset = useChatWallpaper();
    const base = useWallpaperBase();

    return (
      <div
        ref={ref}
        className={cx(styles.surface, className)}
        style={{ ...surfaceColors(preset, base), ...style }}
        {...rest}
      >
        <ViewportFrame>
          {(aspectRatio) => <PatternLayer preset={preset} base={base} aspectRatio={aspectRatio} />}
        </ViewportFrame>
        {children}
      </div>
    );
  },
);
