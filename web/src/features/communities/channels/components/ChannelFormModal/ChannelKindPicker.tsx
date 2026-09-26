import { HashIcon, LockSimpleIcon } from '@phosphor-icons/react';
import { createStyles } from 'antd-style';
import type { ReactNode } from 'react';

import type { ChannelKind } from '../../types';

const useStyles = createStyles(({ token, css }) => ({
  group: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  card: css`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: ${token.paddingSM}px ${token.padding}px;
    border-radius: ${token.borderRadius}px;
    border: 1px solid ${token.colorBorder};
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      border-color: ${token.colorPrimaryBorder};
      background: ${token.colorFillTertiary};
    }
  `,
  cardActive: css`
    border-color: ${token.colorPrimary};
    background: ${token.colorPrimaryBg};

    &:hover {
      border-color: ${token.colorPrimary};
      background: ${token.colorPrimaryBg};
    }
  `,
  icon: css`
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: ${token.colorFillSecondary};
    color: ${token.colorTextSecondary};
  `,
  iconActive: css`
    background: ${token.colorPrimary};
    color: #fff;
  `,
  body: css`
    min-width: 0;
  `,
  label: css`
    font-weight: 600;
    color: ${token.colorText};
  `,
  hint: css`
    display: block;
    color: ${token.colorTextSecondary};
    font-size: ${token.fontSizeSM}px;
  `,
}));

interface ChannelKindPickerProps {
  value?: ChannelKind;
  onChange?: (value: ChannelKind) => void;
}

export function ChannelKindPicker({ value, onChange }: ChannelKindPickerProps) {
  const { styles, cx } = useStyles();
  const options: Array<{ kind: ChannelKind; label: string; hint: string; icon: ReactNode }> = [
    {
      kind: 'public',
      label: 'Публічний',
      hint: 'Бачать і можуть вступити всі учасники простору',
      icon: <HashIcon size={16} weight="bold" />,
    },
    {
      kind: 'private',
      label: 'Приватний',
      hint: 'Видно лише запрошеним учасникам',
      icon: <LockSimpleIcon size={16} weight="bold" />,
    },
  ];

  return (
    <div className={styles.group} role="radiogroup">
      {options.map((option) => {
        const active = value === option.kind;
        return (
          <div
            key={option.kind}
            role="radio"
            aria-checked={active}
            tabIndex={0}
            className={cx(styles.card, active && styles.cardActive)}
            onClick={() => onChange?.(option.kind)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') onChange?.(option.kind);
            }}
          >
            <span className={cx(styles.icon, active && styles.iconActive)}>{option.icon}</span>
            <div className={styles.body}>
              <span className={styles.label}>{option.label}</span>
              <span className={styles.hint}>{option.hint}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
