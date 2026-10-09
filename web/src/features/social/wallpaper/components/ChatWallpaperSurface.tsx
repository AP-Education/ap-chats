import { createStyles } from 'antd-style';
import { type CSSProperties, forwardRef, type HTMLAttributes } from 'react';

import { average, contrast, mix, withAlpha } from '@/shared/theme/color';

import { useOwnBubbleColors } from '../hooks/useOwnBubbleColors';
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

// Service labels on a plain background.
const NEUTRAL_TONE = '#3e4b4f';
const SERVICE_ALPHA = 0.72;

// Day pills and service lines carry white text: the wallpaper's tone deepens until that
// text clears AA on the pill as it composites over the page.
function serviceTone(tone: string, page: string): string {
  let deep = tone;
  for (
    let step = 0;
    step < 12 && contrast('#ffffff', mix(page, deep, SERVICE_ALPHA)) < 4.6;
    step++
  ) {
    deep = mix(deep, '#000000', 0.1);
  }
  return withAlpha(deep, SERVICE_ALPHA);
}

// The chat surface publishes the wallpaper's colours as variables, so bubbles, pills and
// labels inside follow the chosen theme without knowing about wallpapers.
function surfaceColors(preset: WallpaperPreset, base: WallpaperBase): CSSProperties {
  const dark = base.appearance === 'dark';
  const tones = preset.lights.map(({ color }) => color);
  const deepTone = tones.length ? mix(average(tones), '#000000', 0.35) : NEUTRAL_TONE;

  return {
    '--chat-incoming-bg': dark ? 'rgba(44, 55, 59, 0.94)' : 'rgba(255, 255, 255, 0.92)',
    '--chat-service-bg': dark ? 'rgba(255, 255, 255, 0.14)' : serviceTone(deepTone, base.color),
    '--chat-service-strong': serviceTone(deepTone, base.color),
  } as CSSProperties;
}

// The line art over the wallpaper's light, aligned with it; the light itself is ChatBackdrop,
// behind the whole shell.
export const ChatWallpaperSurface = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function ChatWallpaperSurface({ className, style, children, ...rest }, ref) {
    const { styles, cx } = useStyles();
    const preset = useChatWallpaper();
    const base = useWallpaperBase();
    const ownBubbles = useOwnBubbleColors();

    return (
      <div
        ref={ref}
        className={cx(styles.surface, className)}
        style={{ ...surfaceColors(preset, base), ...ownBubbles, ...style }}
        {...rest}
      >
        <ViewportFrame>
          <PatternLayer preset={preset} base={base} />
        </ViewportFrame>
        {children}
      </div>
    );
  },
);
