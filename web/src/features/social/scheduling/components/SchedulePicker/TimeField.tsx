import { Input } from 'antd';
import { createStyles } from 'antd-style';
import { useTranslation } from 'react-i18next';

const useStyles = createStyles(({ token, css }) => ({
  row: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding-top: 12px;
    border-top: 1px solid ${token.colorSplit};
  `,
  // Native, so a phone opens its own wheel and a desktop types the digits in place.
  input: css`
    width: 112px;
    font-variant-numeric: tabular-nums;

    html[data-theme='dark'] & {
      color-scheme: dark;
    }
  `,
}));

interface TimeFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export function TimeField({ value, onChange }: TimeFieldProps) {
  const { styles } = useStyles();
  const { t } = useTranslation('scheduling');

  return (
    <label className={styles.row}>
      {t(($) => $.time)}
      <Input
        type="time"
        className={styles.input}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
