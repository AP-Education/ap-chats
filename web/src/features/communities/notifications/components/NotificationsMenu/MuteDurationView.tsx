import { ArrowLeftIcon } from '@phosphor-icons/react';
import { createStyles } from 'antd-style';

import type { MuteDuration } from './types';

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
}));

interface MuteDurationViewProps {
  title: string;
  onBack: () => void;
  onChooseMute: (duration: MuteDuration) => void;
  onMuteIndefinitely: () => void;
}

export function MuteDurationView({
  title,
  onBack,
  onChooseMute,
  onMuteIndefinitely,
}: MuteDurationViewProps) {
  const { styles } = useStyles();

  return (
    <>
      <button type="button" className={styles.back} onClick={onBack}>
        <ArrowLeftIcon size={16} /> {title}
      </button>
      <div className={styles.divider} />
      {muteDurations.map((duration) => (
        <button
          key={duration.duration}
          type="button"
          className={styles.row}
          onClick={() => onChooseMute(duration.duration)}
        >
          {duration.label}
        </button>
      ))}
      <button type="button" className={styles.row} onClick={onMuteIndefinitely}>
        Поки не ввімкну
      </button>
    </>
  );
}
