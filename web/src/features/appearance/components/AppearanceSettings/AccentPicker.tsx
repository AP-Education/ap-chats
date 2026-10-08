import { CheckIcon } from '@phosphor-icons/react';
import { Tooltip } from 'antd';
import { createStyles } from 'antd-style';
import type { CSSProperties } from 'react';

import { accentPresets } from '../../accents';
import { useAppearance } from '../../hooks/useAppearance';
import { useAccent, useAppearanceActions } from '../../stores/appearance-store';

const useStyles = createStyles(({ token, css }) => ({
  swatches: css`
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  `,
  swatch: css`
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: linear-gradient(175deg, var(--swatch-to), var(--swatch-from));
    color: ${token.colorWhite};
    cursor: pointer;
    transition: box-shadow 0.15s ease;

    &[aria-checked='true'] {
      box-shadow:
        0 0 0 2px ${token.colorBgElevated},
        0 0 0 4px var(--swatch-from);
    }

    &:focus-visible {
      outline: 2px solid ${token.colorPrimary};
      outline-offset: 4px;
    }
  `,
}));

export function AccentPicker() {
  const { styles } = useStyles();
  const appearance = useAppearance();
  const current = useAccent();
  const { chooseAccent } = useAppearanceActions();

  return (
    <div className={styles.swatches} role="radiogroup" aria-label="Колір акценту">
      {accentPresets.map((accent) => {
        const selected = accent.id === current.id;
        return (
          <Tooltip key={accent.id} title={accent.name}>
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={accent.name}
              className={styles.swatch}
              style={
                {
                  '--swatch-from': accent.primary[appearance],
                  '--swatch-to': accent.bubble[1],
                } as CSSProperties
              }
              onClick={() => chooseAccent(accent.id)}
            >
              {selected && <CheckIcon size={16} weight="bold" aria-hidden />}
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}
