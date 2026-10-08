import { createStyles } from 'antd-style';
import { type CSSProperties, useLayoutEffect, useMemo, useRef } from 'react';

import { mix } from '../canvas/color';
import { GRAIN_TILE_PIXELS, renderGrain } from '../canvas/grain';
import { paintLights } from '../canvas/lights';
import { PATTERN_TILE_SIZE } from '../canvas/pattern-tile';
import { usePixelRatio, useTexture } from '../hooks/useTexture';
import type { WallpaperBase } from '../hooks/useWallpaperBase';
import { renderPatternMask } from '../patterns/recipes';
import type { WallpaperAppearance, WallpaperLight, WallpaperPreset } from '../types';

const PATTERN_OPACITY = { light: 0.42, dark: 0.5 };
const GRAIN_OPACITY = { light: 0.35, dark: 0.7 };

const useStyles = createStyles(({ css }) => ({
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

interface LayerProps {
  preset: WallpaperPreset;
  base: WallpaperBase;
  aspectRatio: number;
}

/** The theme background lit by the preset's light shapes: a tiny canvas stretched by CSS. */
export function LightLayer({ preset, base, aspectRatio }: LayerProps) {
  const { styles } = useStyles();
  const ref = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    if (ref.current) paintLights(ref.current, aspectRatio, base.color, preset.lights);
  }, [aspectRatio, base.color, preset.lights]);

  return <canvas ref={ref} className={styles.layer} data-ready />;
}

/**
 * The same light shapes in deeper ink, showing only through the line art: the pattern
 * takes the colour of whatever light it crosses and fades to a quiet neutral between.
 */
export function PatternLayer({ preset, base, aspectRatio }: LayerProps) {
  const { styles, cx } = useStyles();
  const ref = useRef<HTMLCanvasElement>(null);
  const mask = useTexture(preset.pattern, renderPatternMask);
  const ink = useMemo(
    () => inkFor(preset.lights, base.color, base.appearance),
    [preset.lights, base.color, base.appearance],
  );

  useLayoutEffect(() => {
    if (ref.current) paintLights(ref.current, aspectRatio, ink.base, ink.lights);
  }, [aspectRatio, ink, preset.pattern]);

  if (!preset.pattern) return null;

  return (
    <canvas
      ref={ref}
      className={cx(styles.layer, styles.pattern)}
      data-ready={mask ? true : undefined}
      style={
        {
          '--wallpaper-pattern': mask && `url(${mask})`,
          '--layer-opacity': PATTERN_OPACITY[base.appearance],
        } as CSSProperties
      }
    />
  );
}

/** Fine noise shown 1:1, against the banding of smooth gradients. */
export function GrainLayer({ appearance }: { appearance: WallpaperAppearance }) {
  const { styles, cx } = useStyles();
  const pixelRatio = usePixelRatio();
  const grain = useTexture('grain', renderGrain);

  return (
    <span
      className={cx(styles.layer, styles.grain)}
      data-ready={grain ? true : undefined}
      style={
        {
          '--wallpaper-grain': grain && `url(${grain})`,
          '--wallpaper-grain-size': `${GRAIN_TILE_PIXELS / pixelRatio}px`,
          '--layer-opacity': GRAIN_OPACITY[appearance],
        } as CSSProperties
      }
    />
  );
}

const INK = {
  light: { shade: '#000000', neutral: '#2b3440', neutralShare: 0.55 },
  dark: { shade: '#ffffff', neutral: '#ffffff', neutralShare: 0.3 },
};

function inkFor(lights: readonly WallpaperLight[], base: string, appearance: WallpaperAppearance) {
  const { shade, neutral, neutralShare } = INK[appearance];
  return {
    base: mix(base, neutral, neutralShare),
    lights: lights.map((light) => ({
      ...light,
      color: mix(light.color, shade, 0.22),
      strength: Math.min(1, light.strength * 1.5),
    })),
  };
}
