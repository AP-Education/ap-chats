import { CheckIcon } from '@phosphor-icons/react';
import { ColorPicker } from 'antd';
import { createStyles } from 'antd-style';

import { isPresetRoleColor, roleColors } from '../../role-colors';

const useStyles = createStyles(({ token, css }) => ({
  swatches: css`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  `,
  swatch: css`
    display: inline-grid;
    place-items: center;
    width: 24px;
    height: 24px;
    padding: 0;
    border: 2px solid transparent;
    border-radius: 50%;
    color: #fff;
    cursor: pointer;

    &:focus-visible {
      outline: 2px solid ${token.colorPrimary};
      outline-offset: 2px;
    }
  `,
  // A color wheel until a color of one's own is picked, then that color.
  custom: css`
    background: conic-gradient(
      #ef4444,
      #f59e0b,
      #10b981,
      #14b8a6,
      #3b82f6,
      #8b5cf6,
      #ec4899,
      #ef4444
    );
  `,
  selected: css`
    border-color: ${token.colorBgContainer};
    box-shadow: 0 0 0 2px ${token.colorText};
  `,
}));

interface RoleColorPickerProps {
  value: string | null;
  onChange: (color: string) => void;
}

export function RoleColorPicker({ value, onChange }: RoleColorPickerProps) {
  const { styles, cx } = useStyles();
  const current = value?.toLowerCase() ?? null;
  const custom = current && !isPresetRoleColor(current) ? current : null;

  return (
    <div className={styles.swatches} role="radiogroup" aria-label="Колір ролі">
      {roleColors.map((color) => {
        const isSelected = color === current;
        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={color}
            className={cx(styles.swatch, isSelected && styles.selected)}
            style={{ background: color }}
            onClick={() => onChange(color)}
          >
            {isSelected && <CheckIcon size={14} weight="bold" />}
          </button>
        );
      })}
      <ColorPicker
        value={current ?? roleColors[0]}
        disabledAlpha
        disabledFormat
        format="hex"
        onChangeComplete={(color) => onChange(color.toHexString())}
      >
        <button
          type="button"
          role="radio"
          aria-checked={Boolean(custom)}
          aria-label="Свій колір"
          className={cx(styles.swatch, styles.custom, Boolean(custom) && styles.selected)}
          style={custom ? { background: custom } : undefined}
        >
          {custom && <CheckIcon size={14} weight="bold" />}
        </button>
      </ColorPicker>
    </div>
  );
}
