import { createStyles } from 'antd-style';
import { type CSSProperties, useLayoutEffect, useRef } from 'react';

import { paintGradient } from '../canvas/gradient';
import { GRAIN_TILE_PIXELS, renderGrain } from '../canvas/grain';
import { PATTERN_TILE_SIZE } from '../canvas/pattern-tile';
import { usePixelRatio, useTexture } from '../hooks/useTexture';
import { renderPatternMask } from '../patterns/recipes';
import type { WallpaperPreset } from '../types';

const useStyles = createStyles(({ css }) => ({
  backdrop: css`
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  `,
  layer: css`
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
    opacity: 0;
    transition: opacity 240ms ease-out;

    &[data-ready] {
      opacity: var(--layer-opacity, 1);
    }
  `,
  pattern: css`
    mask-image: var(--wallpaper-pattern);
    mask-size: var(--wallpaper-tile, ${PATTERN_TILE_SIZE}px);
    mask-repeat: repeat;
    mask-position: 0 0;
  `,
  grain: css`
    background-image: var(--wallpaper-grain);
    background-size: var(--wallpaper-grain-size);
  `,
}));

interface WallpaperBackdropProps {
  preset: WallpaperPreset;
  className?: string;
}

// Layers, bottom up: a tiny mesh gradient canvas stretched by CSS, a second one in the
// pattern's ink that shows only through the line-art mask, and a 1:1 grain against banding.
export function WallpaperBackdrop({ preset, className }: WallpaperBackdropProps) {
  const { styles, cx } = useStyles();
  const pixelRatio = usePixelRatio();
  const baseRef = useRef<HTMLCanvasElement>(null);
  const inkRef = useRef<HTMLCanvasElement>(null);
  const { pattern } = preset;
  const mask = useTexture(pattern?.id ?? null, renderPatternMask);
  const grain = useTexture('grain', renderGrain);

  useLayoutEffect(() => {
    if (baseRef.current) paintGradient(baseRef.current, preset.colors);
    if (inkRef.current && pattern) paintGradient(inkRef.current, pattern.ink);
  }, [preset.colors, pattern]);

  return (
    <div className={cx(styles.backdrop, className)} aria-hidden>
      <canvas ref={baseRef} className={styles.layer} data-ready />
      {pattern && (
        <canvas
          ref={inkRef}
          className={cx(styles.layer, styles.pattern)}
          data-ready={mask ? true : undefined}
          style={
            {
              '--wallpaper-pattern': mask && `url(${mask})`,
              '--layer-opacity': pattern.opacity,
            } as CSSProperties
          }
        />
      )}
      <span
        className={cx(styles.layer, styles.grain)}
        data-ready={grain ? true : undefined}
        style={
          {
            '--wallpaper-grain': grain && `url(${grain})`,
            '--wallpaper-grain-size': `${GRAIN_TILE_PIXELS / pixelRatio}px`,
            '--layer-opacity': preset.tone === 'dark' ? 0.7 : 0.45,
          } as CSSProperties
        }
      />
    </div>
  );
}
