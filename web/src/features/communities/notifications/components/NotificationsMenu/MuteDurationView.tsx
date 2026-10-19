import { ArrowLeftIcon } from '@phosphor-icons/react';
import { createStyles } from 'antd-style';

import type { MuteDuration, NotificationsMenuSize } from './types';

const muteDurations: Array<{ label: string; duration: MuteDuration }> = [
  { label: 'На 1 годину', duration: 'hour' },
  { label: 'На 24 години', duration: 'day' },
];

const useStyles = createStyles(({ token, css }) => ({
  row: css`
    display: flex;
    align-items: center;
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
  large: css`
    min-height: 48px;
    padding: 8px 12px;
    border-radius: 10px;
    font-size: ${token.fontSize}px;

    &:active {
      background: ${token.colorFillTertiary};
    }
  `,
  back: css`
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px;
    border: 0;
    border-radius: ${token.borderRadius}px;
    background: transparent;
    color: ${token.colorText};
    font: inherit;
    font-size: ${token.fontSizeSM}px;
    font-weight: 600;
    cursor: pointer;
    &:hover,
    &:focus-visible {
      background: ${token.colorFillTertiary};
    }
  `,
  divider: css`
    height: 1px;
    margin: 4px 6px;
    background: ${token.colorBorderSecondary};
  `,
  dividerLarge: css`
    margin: 6px 12px;
  `,
}));

interface MuteDurationViewProps {
  title: string;
  size: NotificationsMenuSize;
  onBack: () => void;
  onChooseMute: (duration: MuteDuration) => void;
  onMuteIndefinitely: () => void;
}

export function MuteDurationView({
  title,
  size,
  onBack,
  onChooseMute,
  onMuteIndefinitely,
}: MuteDurationViewProps) {
  const { styles, cx } = useStyles();
  const isLarge = size === 'large';
  const row = cx(styles.row, isLarge && styles.large);

  return (
    <>
      <button type="button" className={cx(styles.back, isLarge && styles.large)} onClick={onBack}>
        <ArrowLeftIcon size={16} /> {title}
      </button>
      <div className={cx(styles.divider, isLarge && styles.dividerLarge)} />
      {muteDurations.map((duration) => (
        <button
          key={duration.duration}
          type="button"
          className={row}
          onClick={() => onChooseMute(duration.duration)}
        >
          {duration.label}
        </button>
      ))}
      <button type="button" className={row} onClick={onMuteIndefinitely}>
        Поки не ввімкну
      </button>
    </>
  );
}
