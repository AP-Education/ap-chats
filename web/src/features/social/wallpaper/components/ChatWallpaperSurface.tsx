import { createStyles } from 'antd-style';
import { type CSSProperties, forwardRef, type HTMLAttributes } from 'react';

import { withAlpha } from '../canvas/color';
import { useChatWallpaper } from '../stores/wallpaper-store';
import type { WallpaperPreset } from '../types';
import { WallpaperBackdrop } from './WallpaperBackdrop';

const useStyles = createStyles(({ css }) => ({
  surface: css`
    position: relative;
    isolation: isolate;
    overflow: hidden;
  `,
  // Sized by the large viewport and pinned to the top, so an on-screen keyboard or a
  // growing composer clips the wallpaper instead of rescaling it under the messages.
  backdrop: css`
    z-index: -1;
    bottom: auto;
    height: max(100%, 100lvh);
  `,
}));

// The chat surface publishes the wallpaper's colours as variables, so bubbles, pills and
// labels inside follow the chosen theme without knowing about wallpapers.
function surfaceColors(preset: WallpaperPreset): CSSProperties {
  const dark = preset.tone === 'dark';
  return {
    '--chat-own-from': preset.accent[0],
    '--chat-own-to': preset.accent[1],
    '--chat-incoming-bg': dark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.8)',
    '--chat-service-bg': dark ? 'rgba(255, 255, 255, 0.14)' : withAlpha(preset.service, 0.42),
    '--chat-service-strong': withAlpha(preset.service, dark ? 0.78 : 0.64),
  } as CSSProperties;
}

export const ChatWallpaperSurface = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function ChatWallpaperSurface({ className, style, children, ...rest }, ref) {
    const { styles, cx } = useStyles();
    const preset = useChatWallpaper();

    return (
      <div
        ref={ref}
        className={cx(styles.surface, className)}
        style={{ ...surfaceColors(preset), ...style }}
        {...rest}
      >
        <WallpaperBackdrop preset={preset} className={styles.backdrop} />
        {children}
      </div>
    );
  },
);
