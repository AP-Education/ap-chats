import { createStyles } from 'antd-style';
import { useRef } from 'react';

import { useAspectRatio } from '../hooks/useFrameGeometry';
import type { WallpaperBase } from '../hooks/useWallpaperBase';
import type { WallpaperPreset } from '../types';
import { GrainLayer, LightLayer, PatternLayer } from './WallpaperLayers';

const useStyles = createStyles(({ css }) => ({
  backdrop: css`
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  `,
}));

interface WallpaperBackdropProps {
  preset: WallpaperPreset;
  base: WallpaperBase;
  className?: string;
}

/** The whole wallpaper fitted into its own box, for previews. */
export function WallpaperBackdrop({ preset, base, className }: WallpaperBackdropProps) {
  const { styles, cx } = useStyles();
  const ref = useRef<HTMLDivElement>(null);
  const aspectRatio = useAspectRatio(ref);

  return (
    <div ref={ref} className={cx(styles.backdrop, className)} aria-hidden>
      <LightLayer preset={preset} base={base} aspectRatio={aspectRatio} />
      <PatternLayer preset={preset} base={base} aspectRatio={aspectRatio} />
      <GrainLayer appearance={base.appearance} />
    </div>
  );
}
