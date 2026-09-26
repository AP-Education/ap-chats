import { CaretRightIcon } from '@phosphor-icons/react';
import { createStyles } from 'antd-style';

import type { NotificationLevel } from './useChannelNotificationPreference';

const levels: Array<{ value: NotificationLevel; title: string; description?: string }> = [
  { value: 'default', title: 'За замовчуванням', description: 'Лише згадки' },
  { value: 'all', title: 'Усі повідомлення' },
  { value: 'mentions', title: 'Лише згадки' },
  { value: 'none', title: 'Жодних' },
];

const useStyles = createStyles(({ token, css }) => ({
  row: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    width: 100%;
    min-height: 34px;
    padding: 4px 8px;
    border: 0;
    border-radius: ${token.borderRadius}px;
    background: transparent;
    color: ${token.colorText};
    text-align: left;
    font: inherit;
    font-size: ${token.fontSizeSM}px;
    cursor: pointer;
    &:hover,
    &:focus-visible {
      background: ${token.colorFillTertiary};
    }
    &:focus-visible {
      outline: 2px solid ${token.colorPrimary};
    }
  `,
  mainAction: css`
    font-weight: 600;
  `,
  rowText: css`
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
  `,
  description: css`
    color: ${token.colorTextSecondary};
    font-size: 11px;
  `,
  divider: css`
    height: 1px;
    margin: 4px 6px;
    background: ${token.colorBorderSecondary};
  `,
  radio: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    border: 2px solid ${token.colorBorder};
    border-radius: 50%;
  `,
  radioActive: css`
    border-color: ${token.colorPrimary};
    background: ${token.colorPrimary};
  `,
  radioDot: css`
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #fff;
  `,
}));

interface NotificationLevelsViewProps {
  level: NotificationLevel;
  isMuted: boolean;
  onOpenMute: () => void;
  onUnmute: () => void;
  onChooseLevel: (level: NotificationLevel) => void;
}

export function NotificationLevelsView({
  level,
  isMuted,
  onOpenMute,
  onUnmute,
  onChooseLevel,
}: NotificationLevelsViewProps) {
  const { styles, cx } = useStyles();

  return (
    <>
      <button
        type="button"
        className={cx(styles.row, styles.mainAction)}
        onClick={isMuted ? onUnmute : onOpenMute}
      >
        <span>{isMuted ? 'Увімкнути канал' : 'Вимкнути канал'}</span>
        {!isMuted && <CaretRightIcon size={15} />}
      </button>
      <div className={styles.divider} />
      <div role="radiogroup" aria-label="Сповіщення каналу">
        {levels.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={level === option.value}
            className={styles.row}
            onClick={() => onChooseLevel(option.value)}
          >
            <span className={styles.rowText}>
              <span>{option.title}</span>
              {option.description && (
                <span className={styles.description}>{option.description}</span>
              )}
            </span>
            <span className={cx(styles.radio, level === option.value && styles.radioActive)}>
              {level === option.value && <span className={styles.radioDot} />}
            </span>
          </button>
        ))}
      </div>
    </>
  );
}
