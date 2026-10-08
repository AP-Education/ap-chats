import { CheckIcon } from '@phosphor-icons/react';
import { createStyles } from 'antd-style';

import { PATTERN_TILE_SIZE } from '../../canvas/pattern-tile';
import type { WallpaperBase } from '../../hooks/useWallpaperBase';
import type { WallpaperPreset } from '../../types';
import { WallpaperBackdrop } from '../WallpaperBackdrop';

const useStyles = createStyles(({ token, css }) => ({
  card: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: ${token.colorTextSecondary};
    font: inherit;
    font-size: ${token.fontSizeSM}px;
    text-align: center;
    cursor: pointer;

    &[aria-checked='true'] {
      color: ${token.colorText};
      font-weight: 600;
    }

    &:focus-visible {
      outline: none;
    }
  `,
  preview: css`
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    gap: 6px;
    aspect-ratio: 4 / 5;
    padding: 12px 10px;
    overflow: hidden;
    border-radius: ${token.borderRadiusLG}px;
    box-shadow: inset 0 0 0 1px ${token.colorBorderSecondary};
    isolation: isolate;
    transition: box-shadow 0.15s ease;

    [aria-checked='true'] > & {
      box-shadow:
        inset 0 0 0 2px ${token.colorPrimary},
        inset 0 0 0 4px ${token.colorBgContainer};
    }

    button:focus-visible > & {
      outline: 2px solid ${token.colorPrimary};
      outline-offset: 2px;
    }
  `,
  // Half-size doodles let a small card show the pattern's rhythm, not two glyphs.
  backdrop: css`
    --wallpaper-tile: ${PATTERN_TILE_SIZE / 2}px;
    z-index: -1;
  `,
  incoming: css`
    width: 68%;
    height: 18px;
    border-radius: ${token.borderRadiusLG}px ${token.borderRadiusLG}px ${token.borderRadiusLG}px
      ${token.borderRadiusXS}px;
    background: ${token.colorBgElevated};
    box-shadow: 0 1px 2px rgba(16, 40, 36, 0.14);
  `,
  outgoing: css`
    align-self: flex-end;
    width: 54%;
    height: 18px;
    border-radius: ${token.borderRadiusLG}px ${token.borderRadiusLG}px ${token.borderRadiusXS}px
      ${token.borderRadiusLG}px;
    background: linear-gradient(175deg, var(--chat-own-to), var(--chat-own-from));
  `,
  check: css`
    position: absolute;
    top: 8px;
    right: 8px;
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: ${token.colorPrimary};
    color: ${token.colorWhite};
  `,
}));

interface WallpaperPresetCardProps {
  preset: WallpaperPreset;
  base: WallpaperBase;
  selected: boolean;
  onSelect: () => void;
}

export function WallpaperPresetCard({
  preset,
  base,
  selected,
  onSelect,
}: WallpaperPresetCardProps) {
  const { styles } = useStyles();

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      className={styles.card}
      onClick={onSelect}
    >
      <span className={styles.preview}>
        <WallpaperBackdrop preset={preset} base={base} className={styles.backdrop} />
        <span className={styles.incoming} />
        <span className={styles.outgoing} />
        {selected && (
          <span className={styles.check}>
            <CheckIcon size={14} weight="bold" />
          </span>
        )}
      </span>
      {preset.name}
    </button>
  );
}
