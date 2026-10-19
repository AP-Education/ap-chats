import { CaretRightIcon } from '@phosphor-icons/react';
import { createStyles } from 'antd-style';
import { useTranslation } from 'react-i18next';

import type { NotificationLevel } from '../../types';

const levels: NotificationLevel[] = ['default', 'all', 'mentions', 'none'];

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
  const { t } = useTranslation('communities');
  const { styles, cx } = useStyles();

  return (
    <>
      <button
        type="button"
        className={cx(styles.row, styles.mainAction)}
        onClick={isMuted ? onUnmute : onOpenMute}
      >
        <span>{isMuted ? t(($) => $.notifications.unmute) : t(($) => $.notifications.mute)}</span>
        {!isMuted && <CaretRightIcon size={16} />}
      </button>
      <div className={styles.divider} />
      <div role="radiogroup" aria-label={t(($) => $.notifications.title)}>
        {levels.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={level === option}
            className={styles.row}
            onClick={() => onChooseLevel(option)}
          >
            <span className={styles.rowText}>
              <span>{t(($) => $.notifications.levels[option])}</span>
              {option === 'default' && (
                <span className={styles.description}>{t(($) => $.notifications.levels.all)}</span>
              )}
            </span>
            <span className={cx(styles.radio, level === option && styles.radioActive)}>
              {level === option && <span className={styles.radioDot} />}
            </span>
          </button>
        ))}
      </div>
    </>
  );
}
