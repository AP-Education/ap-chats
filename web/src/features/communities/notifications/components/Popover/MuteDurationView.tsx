import { ArrowLeftIcon } from '@phosphor-icons/react';
import { createStyles } from 'antd-style';

const muteDurations = [
  { label: 'На 1 годину', milliseconds: 60 * 60 * 1000 },
  { label: 'На 24 години', milliseconds: 24 * 60 * 60 * 1000 },
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
  onBack: () => void;
  onChooseMute: (milliseconds: number) => void;
  onMuteIndefinitely: () => void;
}

export function MuteDurationView({
  onBack,
  onChooseMute,
  onMuteIndefinitely,
}: MuteDurationViewProps) {
  const { styles } = useStyles();

  return (
    <>
      <button type="button" className={styles.back} onClick={onBack}>
        <ArrowLeftIcon size={15} /> Вимкнути канал
      </button>
      <div className={styles.divider} />
      {muteDurations.map((duration) => (
        <button
          key={duration.label}
          type="button"
          className={styles.row}
          onClick={() => onChooseMute(duration.milliseconds)}
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
